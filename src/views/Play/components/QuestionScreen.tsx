import type { FC } from 'react';
import { useT } from '@/shared/i18n';
import { PixelPanel, PixelButton, Sprite } from '@/shared/Chrome';
import type { TGameState } from '../domain/machine';

type TQuestionScreenProps = {
  state: Extract<TGameState, { kind: 'question' }>;
  onAward: (teamId: string) => void;
  onFinish: () => void;
};

const TeamRow: FC<{
  teamId: string;
  avatarId: string;
  names: readonly [string, string];
  score: number;
  onAward: (teamId: string) => void;
}> = ({ teamId, avatarId, names, score, onAward }) => {
  const handleAward = () => onAward(teamId);
  return (
    <PixelPanel style={{ display: 'flex', alignItems: 'center', gap: 'var(--cb-s3)' }}>
      <Sprite name={`avatar-${avatarId}`} size={32} />
      <span style={{ flex: 1, fontSize: 'var(--cb-fs-small)' }}>
        {names[0]} &amp; {names[1]}
      </span>
      <strong className="cb-heading">{score}</strong>
      <PixelButton variant="positive" onClick={handleAward}>
        +1
      </PixelButton>
    </PixelPanel>
  );
};

/** PHASE 1 fake question: shows the drawn question, lets the table award points. */
export const QuestionScreen: FC<TQuestionScreenProps> = ({ state, onAward, onFinish }) => {
  const t = useT();
  const question = state.deck[state.questionIdx];

  return (
    <>
      <p className="cb-muted" style={{ margin: 0, fontSize: 'var(--cb-fs-small)' }}>
        {t('common.question', { n: state.questionIdx + 1, total: state.deck.length })}
      </p>
      <PixelPanel style={{ textAlign: 'center' }}>
        <p className="cb-question" style={{ margin: 0 }}>
          {question?.text ?? '—'}
        </p>
      </PixelPanel>

      {state.roster.map((team) => (
        <TeamRow
          key={team.teamId}
          teamId={team.teamId}
          avatarId={team.avatarId}
          names={team.players}
          score={state.scores[team.teamId] ?? 0}
          onAward={onAward}
        />
      ))}

      <PixelButton variant="gold" block onClick={onFinish}>
        {t('common.continue')}
      </PixelButton>
    </>
  );
};
