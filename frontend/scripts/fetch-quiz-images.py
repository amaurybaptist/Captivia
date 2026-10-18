#!/usr/bin/env python3
"""Download license-checked Wikimedia Commons photos for quiz subjects.

The script honors inherited HTTP(S)_PROXY settings and urllib's default TLS
certificate verification. It writes one manifest record per distinct query,
atomically saving after each successful download so runs can be resumed.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import email.utils
import hashlib
import html
import json
import re
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = "https://commons.wikimedia.org/w/api.php"
UA = "CaptiviaQuizImageCatalog/1.0 (educational quiz; Wikimedia Commons attribution retained)"
ALLOWED_LICENSE = re.compile(r"CC0(?: 1\.0)?|CC BY(?:-SA)? [0-9.]+", re.I)
BAD_MEDIA = re.compile(
    r"\b(map|distribution|range|diagram|drawing|stamp|logo|coat of arms|"
    r"heraldry|chart|graph|icon|flag|mapa|répartition|carte|dessin|schéma|timbre|blason)\b",
    re.I,
)
BAD_SPECIMEN_TITLE = re.compile(r"\b(egg(?:s)?(?:[- ]?(?:case|cases))?|skull|cranium|skeleton|pelvis|fossil|humerus|femur|vertebra(?:e)?|rib cage|tarsometatarsus|ulna|sternum|bone)\b", re.I)
BAD_SPECIMEN_DESCRIPTION = re.compile(
    r"(?:^\s*(?:egg(?:s)?|egg case)\b|\b(?:skull|cranium|skeleton|pelvis|fossil|humerus|femur|vertebra(?:e)?|rib cage|tarsometatarsus|ulna|sternum|bone)\b)",
    re.I,
)


def is_bad_specimen(title: str, description: str) -> bool:
    # A filename or leading description that identifies the depicted object as
    # eggs, a skull, or a skeleton is strong evidence of a non-animal image.
    # Later mentions of eggs in natural-history notes do not invalidate a live
    # animal photograph (for example, a snake that eats eggs).
    return bool(BAD_SPECIMEN_TITLE.search(title) or BAD_SPECIMEN_DESCRIPTION.search(description))


def clean(value: object) -> str:
    if isinstance(value, dict):
        value = value.get("value", "")
    value = html.unescape(re.sub(r"<[^>]*>", " ", str(value or "")))
    return re.sub(r"\s+", " ", value).strip()


def https_license_url(value: object) -> str:
    raw = clean(value)
    raw = re.sub(r"^http://", "https://", raw, flags=re.I)
    parsed = urllib.parse.urlparse(raw)
    if parsed.scheme != "https" or parsed.hostname != "creativecommons.org":
        return ""
    if parsed.path.startswith(("/licenses/", "/publicdomain/zero/")):
        return urllib.parse.urlunparse(parsed)
    return ""


def license_details(meta: dict) -> tuple[str, str] | None:
    short = clean(meta.get("LicenseShortName"))
    raw_url = meta.get("LicenseUrl")
    url = https_license_url(raw_url)
    if ALLOWED_LICENSE.fullmatch(short) and url:
        return short, url
    if short.lower() == "public domain" and clean(meta.get("Copyrighted")).lower() == "false":
        raw = re.sub(r"^http://", "https://", clean(raw_url), flags=re.I)
        parsed = urllib.parse.urlparse(raw)
        if parsed.scheme == "https" and parsed.hostname == "creativecommons.org" and parsed.path.startswith("/publicdomain/mark/1.0"):
            return short, "https://creativecommons.org/publicdomain/mark/1.0/"
        # Commons sometimes records an explicit Public Domain declaration
        # without a LicenseUrl. Derive the canonical status link only when
        # the template code, usage terms, copyright flag, artist, and credit
        # all independently support that declaration.
        if (
            not clean(raw_url)
            and clean(meta.get("License")).lower() == "pd"
            and clean(meta.get("UsageTerms")).lower() == "public domain"
            and clean(meta.get("Artist"))
            and clean(meta.get("Credit"))
        ):
            return short, "https://creativecommons.org/publicdomain/mark/1.0/"
    return None


def license_url_is_derived(meta: dict) -> bool:
    return bool(
        clean(meta.get("LicenseShortName")).lower() == "public domain"
        and not clean(meta.get("LicenseUrl"))
        and clean(meta.get("Copyrighted")).lower() == "false"
        and clean(meta.get("License")).lower() == "pd"
        and clean(meta.get("UsageTerms")).lower() == "public domain"
        and clean(meta.get("Artist"))
        and clean(meta.get("Credit"))
    )


def credit_url(meta: dict) -> str:
    raw = str(meta.get("Credit", ""))
    match = re.search(r"https?://[^\s<>\"']+", raw)
    url = match.group(0).rstrip(")]},.;") if match else ""
    return url if urllib.parse.urlparse(url).scheme == "https" else ""


def request(url: str, accept: str = "*/*") -> tuple[bytes, str]:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accept})
    attempts = 5
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                if response.status != 200:
                    raise RuntimeError(f"HTTP {response.status}: {url}")
                return response.read(), response.headers.get("Content-Type", "")
        except urllib.error.HTTPError as exc:
            if exc.code != 429 and exc.code < 500:
                raise
            if attempt + 1 == attempts:
                raise
            retry_after = exc.headers.get("Retry-After", "")
            try:
                pause = max(1, min(600, int(retry_after)))
            except ValueError:
                try:
                    retry_date = email.utils.parsedate_to_datetime(retry_after)
                    pause = max(1, min(600, int(retry_date.timestamp() - time.time())))
                except (TypeError, ValueError, OverflowError):
                    pause = min(60, 2 ** (attempt + 1))
            print(f"HTTP {exc.code}; respecting Retry-After for {pause}s", file=sys.stderr)
            time.sleep(pause)
        except urllib.error.URLError:
            if attempt + 1 == attempts:
                raise
            time.sleep(min(30, 2 ** attempt))
    raise RuntimeError("request retries exhausted")


def search(query: str) -> list[dict]:
    params = {
        "action": "query", "generator": "search", "gsrsearch": f"filetype:bitmap {query}",
        "gsrnamespace": "6", "gsrlimit": "50", "prop": "imageinfo",
        "iiprop": "url|extmetadata|size|mime", "iiurlwidth": "960",
        "format": "json", "formatversion": "2",
    }
    payload, _ = request(API + "?" + urllib.parse.urlencode(params), "application/json")
    pages = json.loads(payload).get("query", {}).get("pages", [])
    # API generator results are unordered in JSON; `index` carries search rank.
    return sorted(pages, key=lambda p: (p.get("index", 10**9), p.get("title", "")))


def chunks(values: list[str], size: int = 50):
    for start in range(0, len(values), size):
        yield values[start:start + size]


def commons_imageinfo(file_titles: list[str], cache_path: Path) -> dict[str, dict]:
    """Fetch exact reuse metadata for up to 50 Wikipedia-selected files at once."""
    cache = json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.exists() else {}
    if not isinstance(cache, dict):
        raise ValueError("Commons metadata cache must be an object keyed by normalized file title")
    normalized_requests = {normalize_file_title(title): title for title in dict.fromkeys(file_titles)}
    missing = [title for key, title in normalized_requests.items() if key not in cache]
    groups = list(chunks(missing))
    def fetch_group(group: list[str]) -> dict:
        params = {
            "action": "query", "prop": "imageinfo", "titles": "|".join(group),
            "iiprop": "url|extmetadata|size|mime", "iiurlwidth": "960",
            "format": "json", "formatversion": "2",
        }
        payload, _ = request(API + "?" + urllib.parse.urlencode(params), "application/json")
        return json.loads(payload).get("query", {})
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        futures = {pool.submit(fetch_group, group): group for group in groups}
        for future in concurrent.futures.as_completed(futures):
            group = futures[future]
            response = future.result()
            pages = response.get("pages", [])
            redirects = response.get("redirects", [])
            found_in_response = set()
            for page in pages:
                info = (page.get("imageinfo") or [{}])[0]
                key = normalize_file_title(page.get("title", ""))
                if info:
                    entry = {"page": page, "info": info, "redirects": redirects}
                    cache[key] = entry
                    found_in_response.add(key)
            for requested in group:
                key = normalize_file_title(requested)
                if key not in cache or not cache[key].get("info"):
                    for redirect in redirects:
                        if normalize_file_title(redirect.get("from", "")) == key:
                            target = normalize_file_title(redirect.get("to", ""))
                            target_entry = cache.get(target)
                            if target_entry and target_entry.get("info"):
                                cache[key] = {**target_entry, "redirects": redirects}
                                found_in_response.add(key)
                            break
                if key not in found_in_response and key not in cache:
                    cache[key] = {"notFound": True, "requestedTitle": requested}
            save_manifest(cache_path, cache)
    found: dict[str, dict] = {}
    for norm_title in normalized_requests:
        record = cache.get(norm_title)
        if isinstance(record, dict) and record.get("info"):
            page_title = record.get("page", {}).get("title", normalized_requests[norm_title])
            found[page_title] = record
    return found


def name_matches(query: str, title: str, description: str) -> bool:
    phrase = " ".join(re.findall(r"[a-z0-9]+", query.lower()))
    title_text = " ".join(re.findall(r"[a-z0-9]+", title.lower()))
    description_text = " ".join(re.findall(r"[a-z0-9]+", description.lower()))
    # Require the complete normalized scientific binomial as a contiguous
    # phrase. Separate token membership accepts false matches such as Gekko
    # chinensis for a Gekko gecko query because "gecko" appears twice.
    return any(f" {phrase} " in f" {text} " for text in (title_text, description_text))


def normalized_query(query: str) -> str:
    return " ".join(re.findall(r"[a-z0-9]+", query.lower()))


def normalize_file_title(title: str) -> str:
    """Normalize Commons file titles without discarding non-ASCII letters."""
    title = re.sub(r"^file:", "", title.strip(), flags=re.I)
    title = unicodedata.normalize("NFC", title).replace("_", " ").casefold()
    return " ".join(title.split())


def file_title_matches(expected: str, actual: str, redirects: list[dict] | None = None) -> bool:
    """Require exact Unicode title equality, following only recorded Commons redirects."""
    expected_norm = normalize_file_title(expected)
    actual_norm = normalize_file_title(actual)
    mapping = {
        normalize_file_title(row.get("from", "")): normalize_file_title(row.get("to", ""))
        for row in (redirects or []) if row.get("from") and row.get("to")
    }
    seen = set()
    while expected_norm in mapping and expected_norm not in seen:
        seen.add(expected_norm)
        expected_norm = mapping[expected_norm]
    return expected_norm == actual_norm


def jpeg_dimensions(data: bytes) -> tuple[int, int] | None:
    if not data.startswith(b"\xff\xd8"):
        return None
    i = 2
    while i + 4 <= len(data):
        if data[i] != 0xFF:
            i += 1
            continue
        while i < len(data) and data[i] == 0xFF:
            i += 1
        if i >= len(data):
            break
        marker = data[i]
        i += 1
        if marker in (0xD8, 0xD9) or 0xD0 <= marker <= 0xD7 or marker == 0x01:
            continue
        if i + 2 > len(data):
            break
        length = int.from_bytes(data[i:i + 2], "big")
        if length < 2 or i + length > len(data):
            break
        if marker in {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}:
            if length >= 7:
                return int.from_bytes(data[i + 5:i + 7], "big"), int.from_bytes(data[i + 3:i + 5], "big")
            return None
        i += length
    return None


def image_dimensions(data: bytes) -> tuple[int, int] | None:
    if data.startswith(b"\x89PNG\r\n\x1a\n") and len(data) >= 24:
        return int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")
    return jpeg_dimensions(data)


def original_dimensions_ok(width: int, height: int, is_vector: bool = False) -> bool:
    if is_vector:
        return True  # the rendered PNG thumbnail is checked after download
    return min(width, height) >= 200 and max(width, height) >= 400 and width * height >= 100_000


def load_mapping(path: Path) -> dict[str, dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("subjects mapping must be an object keyed by question ID")
    for qid, row in data.items():
        if not isinstance(row, dict) or not all(row.get(k) for k in ("subject", "query", "caption")):
            raise ValueError(f"incomplete subject entry: {qid}")
    return data


def save_manifest(path: Path, manifest: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as tmp:
        json.dump(manifest, tmp, ensure_ascii=False, indent=2)
        tmp.write("\n")
        temp_path = Path(tmp.name)
    temp_path.replace(path)


VALIDATED_TAXON_ALIASES = {
    "Peripatus solorzanoi": ["Mongeperipatus solorzanoi"],
    "Desmophyllum pertusum": ["Lophelia pertusa"],
}


def find_candidate(query: str, aliases: list[str] | None = None) -> tuple[dict, dict, str, str, str] | None:
    for search_name in [query, *(aliases or [])]:
        for page in search(search_name):
            info = (page.get("imageinfo") or [{}])[0]
            meta = info.get("extmetadata", {})
            title = page.get("title", "")
            description = clean(meta.get("ImageDescription"))
            if not name_matches(search_name, title, description):
                continue
            if BAD_MEDIA.search(f"{title} {description}") or is_bad_specimen(title, description):
                continue
            license_pair = license_details(meta)
            creator = clean(meta.get("Artist"))
            if not license_pair or not creator:
                continue
            source_mime = info.get("mime")
            thumbnail_url = info.get("thumburl", "")
            is_rendered_svg = source_mime == "image/svg+xml" and ".png" in urllib.parse.urlparse(thumbnail_url).path.lower()
            if source_mime not in ("image/jpeg", "image/png") and not is_rendered_svg:
                continue
            if not original_dimensions_ok(info.get("width", 0), info.get("height", 0), is_rendered_svg):
                continue
            image_url = thumbnail_url
            if not image_url.startswith("https://"):
                continue
            license_name, license_url = license_pair
            return page, info, license_name, license_url, search_name
    return None


def candidate_from_info(page: dict, info: dict) -> tuple[dict, dict, str, str] | None:
    meta = info.get("extmetadata", {})
    title = page.get("title", "")
    description = clean(meta.get("ImageDescription"))
    if BAD_MEDIA.search(f"{title} {description}") or is_bad_specimen(title, description):
        return None
    license_pair = license_details(meta)
    if not license_pair or not clean(meta.get("Artist")):
        return None
    source_mime = info.get("mime")
    thumbnail_url = info.get("thumburl", "")
    is_rendered_svg = source_mime == "image/svg+xml" and ".png" in urllib.parse.urlparse(thumbnail_url).path.lower()
    if source_mime not in ("image/jpeg", "image/png") and not is_rendered_svg:
        return None
    if not original_dimensions_ok(info.get("width", 0), info.get("height", 0), is_rendered_svg):
        return None
    if not (thumbnail_url or info.get("url", "")).startswith("https://"):
        return None
    return page, info, license_pair[0], license_pair[1]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--subjects", required=True, help="JSON map qid -> {subject, query, caption}")
    parser.add_argument("--wiki-cache", default="/tmp/captivia-quiz-wikipedia-images.json", help="query-keyed Wikipedia pageimages cache")
    parser.add_argument("--commons-cache", default="/tmp/captivia-quiz-commons-imageinfo.json", help="persistent Commons license/filename metadata cache")
    parser.add_argument("--manifest", default=str(ROOT / "src/lib/quiz/image-assets.json"))
    parser.add_argument("--public-dir", default=str(ROOT / "public/quiz/images"))
    parser.add_argument("--limit", type=int, help="optional maximum number of distinct queries for a trial run")
    args = parser.parse_args()
    subjects = load_mapping(Path(args.subjects))
    wiki_cache_path = Path(args.wiki_cache)
    wiki_cache = json.loads(wiki_cache_path.read_text(encoding="utf-8")) if wiki_cache_path.exists() else {}
    if not isinstance(wiki_cache, dict):
        raise ValueError("Wikipedia image cache must be an object keyed by scientific query")
    manifest_path, outdir = Path(args.manifest).resolve(), Path(args.public_dir).resolve()
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    outdir.mkdir(parents=True, exist_ok=True)
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if not isinstance(manifest, dict):
            raise ValueError("existing image-assets manifest must be a query-keyed JSON object")
    else:
        manifest = {}

    # Revalidate cached matches under the same exact binomial rule before
    # skipping them. Drop stale false matches so the query can be fetched again.
    invalid_cache = []
    stale_srcs = []
    for query, record in list(manifest.items()):
        article_from = record.get("articleRedirectFrom", "")
        article_exact = False
        if record.get("sourceType") == "wikipedia-pageimage":
            wiki_entry = wiki_cache.get(query, {})
            expected_file = wiki_entry.get("pageimage", "") if isinstance(wiki_entry, dict) else ""
            redirects = record.get("commonsFileRedirects", [])
            article_exact = (
                normalized_query(record.get("requestedScientificName", "")) == normalized_query(query)
                and bool(record.get("articleTitle"))
                and bool(expected_file)
                and file_title_matches(expected_file, record.get("title", ""), redirects)
            )
        title = str(record.get("title", ""))
        description = str(record.get("description", ""))
        content_ok = not BAD_MEDIA.search(f"{title} {description}") and not is_bad_specimen(title, description)
        identity_ok = content_ok and (article_exact or name_matches(query, title, description))
        alias_verified = (
            record.get("sourceType") == "commons-validated-alias"
            and normalized_query(record.get("requestedScientificName", "")) == normalized_query(query)
            and normalized_query(record.get("matchedTaxonName", "")) in {normalized_query(x) for x in VALIDATED_TAXON_ALIASES.get(query, [])}
            and bool(record.get("articleTitle"))
        )
        if not identity_ok and not alias_verified:
            invalid_cache.append(query)
            src = record.get("src", "")
            if src.startswith("/quiz/images/"):
                stale_srcs.append(src)
            del manifest[query]
    if invalid_cache:
        still_referenced = {record.get("src") for record in manifest.values()}
        for src in stale_srcs:
            if src not in still_referenced:
                candidate_file = outdir / Path(src).name
                if candidate_file.is_file():
                    candidate_file.unlink()
        save_manifest(manifest_path, manifest)
        print(f"Removed {len(invalid_cache)} cached species mismatch(es): {', '.join(invalid_cache)}", file=sys.stderr)

    query_subjects: dict[str, list[dict]] = {}
    query_text: dict[str, str] = {}
    for qid, row in subjects.items():
        norm = normalized_query(row["query"])
        query_text.setdefault(norm, row["query"])
        query_subjects.setdefault(norm, []).append({"qid": qid, "subject": row["subject"], "caption": row["caption"]})
    existing_norm = {normalized_query(key): key for key in manifest}
    # Reuse existing manifest key spellings when a later mapping differs only
    # in case or punctuation; one canonical asset per normalized scientific name.
    for norm, existing_key in existing_norm.items():
        if norm in query_text:
            query_text[norm] = existing_key
    queries = list(query_text)
    if args.limit is not None:
        queries = queries[:args.limit]
    failures = []
    print(f"Mapping: {len(subjects)} questions, {len(query_subjects)} distinct queries; processing {len(queries)}")

    pending = [norm for norm in queries if not (query_text[norm] in manifest and manifest[query_text[norm]].get("src"))]
    deferred = [norm for norm in pending if isinstance(wiki_cache.get(query_text[norm]), dict) and wiki_cache[query_text[norm]].get("error")]
    active_pending = [norm for norm in pending if norm not in deferred]
    cached = [norm for norm in queries if norm not in pending]
    for norm in cached:
        record = dict(manifest[query_text[norm]])
        record["subjects"] = query_subjects[norm]
        query = query_text[norm]
        wiki = wiki_cache.get(query, {})
        expected = wiki.get("pageimage") if isinstance(wiki, dict) else None
        if not record.get("sourceType"):
            record["requestedScientificName"] = query
            if expected and file_title_matches(expected, record.get("title", "")):
                record["sourceType"] = "wikipedia-pageimage"
            else:
                record["sourceType"] = "commons-exact-name-fallback"
                record["identityEvidence"] = "Commons title or description contains the exact scientific name"
        if record.get("sourceType") == "wikipedia-pageimage" and expected and file_title_matches(expected, record.get("title", ""), record.get("commonsFileRedirects", [])):
            record["wikipediaFileTitle"] = expected
            record["wikipediaPageimage"] = expected
            record["requestedFileTitle"] = wiki.get("fileTitle", expected if str(expected).lower().startswith("file:") else "File:" + str(expected))
            record["verifiedFileTitleMatch"] = True
            record.setdefault("commonsFileRedirects", [])
            record["articleTitle"] = wiki.get("articleTitle")
            record["articleUrl"] = wiki.get("articleUrl")
            record["articleRedirectFrom"] = wiki.get("articleRedirectFrom", "")
            record["articleRedirectTo"] = wiki.get("articleTitle", "") if wiki.get("redirected") else ""
            record["identityEvidence"] = "Wikipedia pageimage for resolved article " + str(wiki.get("articleTitle", ""))
        manifest[query_text[norm]] = record
    if cached:
        save_manifest(manifest_path, manifest)
    for norm in cached:
        print(f"cached: {query_text[norm]}")

    # The parent-prepared Wikipedia lookup supplies the exact resolved species
    # article and its lead image. Commons still provides reuse/license metadata.
    wiki_by_query: dict[str, dict] = {}
    requested_files = []
    for norm in active_pending:
        query = query_text[norm]
        entry = wiki_cache.get(query)
        if not isinstance(entry, dict) or not entry.get("pageimage"):
            continue
        pageimage = str(entry["pageimage"])
        file_title = pageimage if pageimage.lower().startswith("file:") else "File:" + pageimage
        article_title = entry.get("articleTitle", "")
        if not article_title:
            continue
        wiki_by_query[query] = {**entry, "fileTitle": file_title}
        requested_files.append(file_title)
    commons_by_title = commons_imageinfo(requested_files, Path(args.commons_cache).resolve()) if requested_files else {}
    by_normalized_file = {normalize_file_title(key): value for key, value in commons_by_title.items()}
    direct_candidates: dict[str, dict] = {}
    for query, wiki in wiki_by_query.items():
        found = by_normalized_file.get(normalize_file_title(wiki["fileTitle"]))
        if found:
            candidate = candidate_from_info(found["page"], found["info"])
            redirects = found.get("redirects", [])
            if candidate and file_title_matches(wiki["fileTitle"], found["page"].get("title", ""), redirects):
                direct_candidates[query] = {"candidate": candidate, "wiki": wiki, "redirects": redirects}
    print(f"Wikipedia pageimages: {len(wiki_by_query)}; valid Commons reuse records: {len(direct_candidates)}; deferred 429 cache entries: {len(deferred)}")

    def process(norm: str) -> tuple[str, dict | None, dict | None]:
        query = query_text[norm]
        if query in manifest and manifest[query].get("src"):
            record = dict(manifest[query])
            record["subjects"] = query_subjects[norm]
            return query, record, None
        source_type = "wikipedia-pageimage"
        wiki = wiki_by_query.get(query)
        found = direct_candidates.get(query)
        if found:
            candidate = found["candidate"]
            wiki = found["wiki"]
            commons_redirects = found.get("redirects", [])
            page, info, license_name, license_url = candidate
            matched_name = query
        else:
            source_type = "commons-exact-name-fallback"
            aliases = VALIDATED_TAXON_ALIASES.get(query, [])
            candidate = find_candidate(query, aliases)
            wiki = None
            commons_redirects = []
        if not candidate:
            return query, None, {"query": query, "subjects": [x["qid"] for x in query_subjects[norm]], "reason": "No matching licensed, attributed Commons image with a verified species identity"}
        if not found:
            page, info, license_name, license_url, matched_name = candidate
        if matched_name != query:
            wiki = wiki_cache.get(query, {})
            source_type = "commons-validated-alias"
        image_url = info.get("thumburl") or info.get("url")
        data, content_type = request(image_url, "image/*")
        mime = content_type.split(";", 1)[0].lower()
        dimensions = image_dimensions(data)
        if mime not in ("image/jpeg", "image/png") or not dimensions or max(dimensions) < 400:
            return query, None, {"query": query, "subjects": [x["qid"] for x in query_subjects[norm]], "reason": f"Downloaded thumbnail failed JPEG/PNG dimension validation ({mime}, {dimensions})"}
        title = page["title"]
        description = clean(info.get("extmetadata", {}).get("ImageDescription"))
        creator = clean(info["extmetadata"].get("Artist"))
        source_page = "https://commons.wikimedia.org/wiki/" + urllib.parse.quote(title.replace(" ", "_"), safe=":_()!,.-")
        digest = hashlib.sha256(data).hexdigest()
        safe_name = re.sub(r"[^a-z0-9]+", "-", query.lower()).strip("-")
        extension = ".png" if mime == "image/png" else ".jpg"
        filename = f"{safe_name}-{digest[:10]}{extension}"
        (outdir / filename).write_bytes(data)
        record = {
            "src": "/quiz/images/" + filename,
            "sourcePage": source_page,
            "title": title.removeprefix("File:"),
            "creator": creator,
            "licenseName": license_name,
            "licenseUrl": license_url,
            "attribution": f"{title.removeprefix('File:')} — {creator} — {license_name} ({license_url}) — {source_page}",
            "width": dimensions[0],
            "height": dimensions[1],
            "originalWidth": info.get("width"),
            "originalHeight": info.get("height"),
            "mimeType": mime,
            "sourceMimeType": info.get("mime"),
            "kind": "illustration" if info.get("mime") == "image/svg+xml" or re.search(r"scientific illustration|species illustration", title + " " + description, re.I) else ("photo" if mime == "image/jpeg" else "image"),
            "bytes": len(data),
            "sha256": digest,
            "description": description,
            "query": query,
            "sourceType": source_type,
            "subjects": query_subjects[norm],
        }
        metadata = info.get("extmetadata", {})
        if license_url_is_derived(metadata):
            record["isDerivedLicenseUrl"] = True
            record["licenseEvidence"] = {
                "License": clean(metadata.get("License")),
                "LicenseShortName": clean(metadata.get("LicenseShortName")),
                "UsageTerms": clean(metadata.get("UsageTerms")),
                "Copyrighted": clean(metadata.get("Copyrighted")),
                "Artist": creator,
                "Credit": clean(metadata.get("Credit")),
                "ImageDescription": description,
                "sourcePage": source_page,
            }
            record["creditUrl"] = credit_url(metadata)
        if wiki:
            record.update({
                "articleTitle": wiki.get("articleTitle"),
                "articleUrl": wiki.get("articleUrl"),
                "articleRedirectFrom": wiki.get("articleRedirectFrom", ""),
                "articleRedirectTo": wiki.get("articleTitle", "") if wiki.get("redirected") else "",
                "requestedScientificName": query,
                "wikipediaPageimage": wiki.get("pageimage"),
                "wikipediaFileTitle": wiki.get("pageimage"),
                "requestedFileTitle": wiki.get("fileTitle"),
                "verifiedFileTitleMatch": file_title_matches(wiki.get("fileTitle", ""), title, commons_redirects),
                "commonsFileRedirects": commons_redirects,
                "identityEvidence": "Wikipedia pageimage for resolved article " + str(wiki.get("articleTitle", "")),
            })
            if matched_name != query:
                record["matchedTaxonName"] = matched_name
                record["identityEvidence"] = f"Validated Wikipedia taxon synonym: {query} → {wiki.get('articleTitle', matched_name)}; image metadata identifies {matched_name}"
        return query, record, None

    # Two workers are the hard maximum for image downloads and fallback searches.
    # The main thread alone mutates and atomically writes the manifest.

    for norm in deferred:
        failures.append({"query": query_text[norm], "subjects": [x["qid"] for x in query_subjects[norm]], "reason": "Wikipedia lookup was rate-limited; queued for parent retry"})
    failure_path = Path("/tmp/quiz-image-failures.json")
    failure_path.write_text(json.dumps({"generatedAt": datetime.now(timezone.utc).isoformat(), "failures": failures}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        futures = {pool.submit(process, norm): (index, norm) for index, norm in enumerate(active_pending, 1)}
        for future in concurrent.futures.as_completed(futures):
            index, norm = futures[future]
            query = query_text[norm]
            try:
                query, record, failure = future.result()
            except Exception as exc:
                record = None
                failure = {"query": query, "subjects": [x["qid"] for x in query_subjects[norm]], "reason": f"{type(exc).__name__}: {exc}"}
            if failure:
                failures.append(failure)
                print(f"[{index}/{len(active_pending)}] FAILED {query}: {failure['reason']}", file=sys.stderr)
            elif record:
                manifest[query] = record
                save_manifest(manifest_path, manifest)
                print(f"[{index}/{len(active_pending)}] OK {query}: {record['title']} ({record['licenseName']}, {record['width']}×{record['height']})")
            failure_path = Path("/tmp/quiz-image-failures.json")
            failure_path.write_text(json.dumps({"generatedAt": datetime.now(timezone.utc).isoformat(), "failures": failures}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    failure_path = Path("/tmp/quiz-image-failures.json")
    failure_path.write_text(json.dumps({"generatedAt": datetime.now(timezone.utc).isoformat(), "failures": failures}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Finished: {len(manifest)} total manifest queries; {len(failures)} failures. Failure report: {failure_path}")
    return 0 if not failures else 2


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"fatal: {exc}", file=sys.stderr)
        raise SystemExit(1)
