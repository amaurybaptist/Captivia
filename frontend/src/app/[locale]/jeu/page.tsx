import type { Metadata } from 'next';
import QuizApp from '@/components/quiz/QuizApp';
import { loadPhotoCopy } from '@/lib/quiz/photo/i18n';
import { loadQuizCopy, quizLocale } from '@/lib/quiz/i18n';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const photo = await loadPhotoCopy(quizLocale((await params).locale));
  return { title: photo.pageTitle, description: photo.pageDescription };
}

export default async function GamePage({ params }: Props) {
  const locale = quizLocale((await params).locale);
  const [copy, photo] = await Promise.all([loadQuizCopy(locale), loadPhotoCopy(locale)]);
  return <QuizApp key={locale} locale={locale} copy={copy} photo={photo} />;
}
