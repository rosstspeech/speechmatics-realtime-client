'use client';
import { useReducer } from 'react';
import {
  type RealtimeServerMessage,
  useRealtimeEventListener,
} from '@speechmatics/real-time-client-react';
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from './ErrorFallback';
import { exportToWord } from '@/utils/exportToWord';

export function Output() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Component />
    </ErrorBoundary>
  );
}

function groupBySpeaker(words: readonly Word[]) {
  const groups: { speaker: string; words: Word[] }[] = [];

  for (const word of words) {
    const lastGroup = groups[groups.length - 1];
    if (!lastGroup || lastGroup.speaker !== word.speaker) {
      groups.push({ speaker: word.speaker, words: [word] });
    } else {
      lastGroup.words.push(word);
    }
  }

  return groups;
}

export function Component() {
  const [transcription, dispatch] = useReducer(transcriptReducer, []);

  useRealtimeEventListener('receiveMessage', (e) => dispatch(e.data));
  
  return (
    <article>
      <header>
        Output &nbsp;&nbsp;
      </header>
      {groupBySpeaker(transcription).map(({ speaker, words }, i) => (
        <section key={`${speaker}-${i}`} className="mb-4">
          {speaker && (
            <span className="pill">
              {speaker}
            </span>
          )}
          <p className={speaker}>
            {words.map((word, index) => (
              <span
                key={`${word.text}-${word.startTime}-${index}`}
                className={word.partial ? 'partial' : ''}
              >
                {!word.punctuation && ' '}
                {word.text}
              </span>
            ))}
          </p>
        </section>
      ))}
      <button onClick={() => exportToWord(transcription)} className="submit">
        Export to Word
      </button>
    </article>
  );
}

interface Word {
  text: string;
  speaker: string;
  startTime: number;
  endTime: number;
  punctuation: boolean;
  partial?: boolean;
}

function transcriptReducer(
  words: readonly Word[],
  event: RealtimeServerMessage,
): readonly Word[] {
  if (event.message === 'AddTranscript') {
    return [
      ...words.filter((w) => !w.partial),
      ...event.results.map((result) => ({
        text: result.alternatives?.[0].content ?? '',
        speaker: result.alternatives?.[0].speaker ?? '',
        startTime: result.start_time ?? 0,
        endTime: result.end_time ?? 0,
        punctuation: result.type === 'punctuation',
      })),
    ];
  }

  if (event.message === 'AddPartialTranscript') {
    return [
      ...words.filter((w) => !w.partial),
      ...event.results.map((result) => ({
        text: result.alternatives?.[0].content ?? '',
        speaker: result.alternatives?.[0].speaker ?? '',
        startTime: result.start_time ?? 0,
        endTime: result.end_time ?? 0,
        punctuation: result.type === 'punctuation',
        partial: true,
      })),
    ];
  }

  return words;
}
