"""Regression checks for previously observed Commons species mismatches."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location(
    "quiz_images", Path(__file__).with_name("fetch-quiz-images.py")
)
images = importlib.util.module_from_spec(spec)
spec.loader.exec_module(images)


class SpeciesIdentityTests(unittest.TestCase):
    def test_japanese_and_cyrillic_file_titles_never_collide(self):
        self.assertNotEqual(
            images.normalize_file_title('File:アベニーパファー.jpg'),
            images.normalize_file_title('File:Нарвал в российской Арктике.jpg'),
        )
        self.assertNotEqual(
            images.normalize_file_title('File:Кошачья_блоха.jpg'),
            images.normalize_file_title('File:Нарвал в российской Арктике.jpg'),
        )

    def test_file_identity_preserves_accents_and_normalizes_nfc_and_spaces(self):
        self.assertEqual(images.normalize_file_title('File:Épervier_d’Europe.JPG'), images.normalize_file_title('E\u0301pervier d’Europe.jpg'))
        self.assertNotEqual(images.normalize_file_title('Épervier.jpg'), images.normalize_file_title('Epervier.jpg'))

    def test_file_title_match_only_follows_explicit_commons_redirects(self):
        self.assertTrue(images.file_title_matches('File:アベニーパファー.jpg', 'アベニーパファー.jpg'))
        self.assertFalse(images.file_title_matches('File:アベニーパファー.jpg', 'Нарвал в российской Арктике.jpg'))
        self.assertFalse(images.file_title_matches('File:Old name.jpg', 'New name.jpg'))
        self.assertTrue(images.file_title_matches(
            'File:Old name.jpg', 'New name.jpg',
            [{'from': 'File:Old name.jpg', 'to': 'File:New_name.jpg'}],
        ))

    def test_repeated_genus_and_species_require_both_words(self):
        self.assertFalse(images.name_matches(
            "Gekko gecko", "Chinese gecko (Gekko chinensis) Aberdeen.jpg",
            "Chinese gecko (Gekko chinensis), Hong Kong"
        ))
        self.assertTrue(images.name_matches(
            "Gekko gecko", "Tokay gecko.jpg", "Tokay gecko (Gekko gecko)"
        ))

    def test_other_repeated_scientific_names(self):
        self.assertFalse(images.name_matches("Naja naja", "Naja kaouthia.jpg", "Naja kaouthia"))
        self.assertFalse(images.name_matches("Scincus scincus", "Scincus mitranus.jpg", "Scincus mitranus"))

    def test_words_separated_across_other_names_do_not_identify_species(self):
        self.assertFalse(images.name_matches(
            "Lampropeltis californiae", "Lampropeltis getula.jpg",
            "Lampropeltis getula near a comparison chart for californiae"
        ))

    def test_normalized_filename_can_supply_species_identity(self):
        self.assertTrue(images.name_matches("Felis catus", "Felis_catus_(domestic_cat).jpg", ""))
        self.assertFalse(images.name_matches("Felis catus", "Felis_silvestris.jpg", "Wild cat"))


class LicenseAndSpecimenTests(unittest.TestCase):
    @staticmethod
    def meta(name, url, copyrighted='True'):
        return {'LicenseShortName': {'value': name}, 'LicenseUrl': {'value': url}, 'Copyrighted': {'value': copyrighted}}

    def test_noncommercial_and_no_derivatives_are_excluded(self):
        for name, path in [('CC BY-NC 4.0', 'by-nc'), ('CC BY-ND 4.0', 'by-nd')]:
            self.assertIsNone(images.license_details(self.meta(name, f'https://creativecommons.org/licenses/{path}/4.0/')))

    def test_missing_or_unrelated_license_url_is_excluded(self):
        self.assertIsNone(images.license_details(self.meta('CC BY 4.0', '')))
        self.assertIsNone(images.license_details(self.meta('CC BY 4.0', 'https://example.test/by/4.0/')))
        self.assertIsNotNone(images.license_details(self.meta('CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/')))

    def test_public_domain_requires_explicit_non_copyrighted_status(self):
        url = 'https://creativecommons.org/publicdomain/mark/1.0/'
        self.assertIsNone(images.license_details(self.meta('Public domain', url, 'True')))
        self.assertIsNotNone(images.license_details(self.meta('Public domain', url, 'False')))

    def test_body_photos_are_not_rejected_for_notes_about_reproduction(self):
        self.assertFalse(images.is_bad_specimen('Muraena helena, Regga.jpg', 'Adult moray'))
        self.assertFalse(images.is_bad_specimen('Adult moth.jpg', 'This species lays eggs on leaves.'))
        self.assertTrue(images.is_bad_specimen('Trichechus manatus Skull 1.jpg', ''))
        self.assertTrue(images.is_bad_specimen('MHNT bird.jpg', 'Egg of Golden Oriole. Museum collection.'))


if __name__ == "__main__":
    unittest.main()
