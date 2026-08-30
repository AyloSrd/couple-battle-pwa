import { useEffect, useState, type ChangeEvent, type CSSProperties, type FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useT } from '@/shared/i18n';
import { useSoundApi } from '@/shared/sound';
import { useDraftGame } from '@/shared/session';
import { AVATAR_IDS, type TAvatarId, type TTeam, type TRoster } from '@/shared/game';
import { Screen, PixelPanel, PixelButton, Sprite } from '@/shared/Chrome';

const COUNTS = [1, 2, 3, 4] as const;

const inputStyle: CSSProperties = {
  fontFamily: 'var(--cb-font-body)',
  fontSize: 'var(--cb-fs-body)',
  padding: 'var(--cb-s2) var(--cb-s3)',
  border: 'var(--cb-border)',
  background: 'var(--cb-white)',
  width: '100%',
  boxSizing: 'border-box',
};

export const SetupView: FC = () => {
  const t = useT();
  const navigate = useNavigate();
  const sound = useSoundApi();
  const { setRoster } = useDraftGame();

  const [count, setCount] = useState<number | null>(null);
  const [teams, setTeams] = useState<TTeam[]>([]);
  const [avatar, setAvatar] = useState<TAvatarId | null>(null);
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [taken, setTaken] = useState<string | null>(null);

  useEffect(() => {
    if (!taken) return;
    const id = setTimeout(() => setTaken(null), 1600);
    return () => clearTimeout(id);
  }, [taken]);

  const takenAvatars = new Set(teams.map((team) => team.avatarId));
  const coupleIdx = teams.length;

  const resetCoupleForm = () => {
    setAvatar(null);
    setName1('');
    setName2('');
    setError(null);
  };

  const makePickCount = (n: number) => () => {
    sound.play('sfx.select');
    setCount(n);
  };

  const makeSelectAvatar = (id: TAvatarId) => () => {
    if (takenAvatars.has(id)) {
      sound.play('sfx.error');
      setTaken(t('setup.team.taken'));
      return;
    }
    sound.play('sfx.select');
    setAvatar(id);
  };

  const handleConfirmCouple = () => {
    if (!avatar) {
      sound.play('sfx.error');
      setError(t('setup.team.pick', { n: coupleIdx + 1 }));
      return;
    }
    if (!name1.trim() || !name2.trim()) {
      sound.play('sfx.error');
      setError(t('setup.names.required'));
      return;
    }
    const team: TTeam = {
      teamId: `t${coupleIdx + 1}`,
      avatarId: avatar,
      players: [name1.trim(), name2.trim()],
    };
    const nextTeams = [...teams, team];
    sound.play('sfx.select');

    if (count !== null && nextTeams.length >= count) {
      setRoster(nextTeams as TRoster);
      navigate({ to: '/mode' });
      return;
    }
    setTeams(nextTeams);
    resetCoupleForm();
  };

  const handleBack = () => {
    sound.play('sfx.back');
    if (count === null) {
      navigate({ to: '/' });
    } else if (coupleIdx === 0) {
      setCount(null);
    } else {
      const prev = teams[teams.length - 1]!;
      setTeams(teams.slice(0, -1));
      setAvatar(prev.avatarId);
      setName1(prev.players[0]);
      setName2(prev.players[1]);
    }
  };

  const handleName1 = (e: ChangeEvent<HTMLInputElement>) => setName1(e.target.value);
  const handleName2 = (e: ChangeEvent<HTMLInputElement>) => setName2(e.target.value);

  return (
    <Screen>
      <PixelButton variant="ghost" onClick={handleBack}>
        ← {t('common.back')}
      </PixelButton>

      {count === null ? (
        <>
          <h1 className="cb-title">{t('setup.title')}</h1>
          <p className="cb-heading">{t('setup.couples.count')}</p>
          <div style={{ display: 'flex', gap: 'var(--cb-s2)' }}>
            {COUNTS.map((n) => (
              <PixelButton key={n} variant="primary" block onClick={makePickCount(n)}>
                {n}
              </PixelButton>
            ))}
          </div>
        </>
      ) : (
        <>
          <h1 className="cb-title">{t('setup.team.pick', { n: coupleIdx + 1 })}</h1>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 'var(--cb-s2)',
            }}
          >
            {AVATAR_IDS.map((id) => {
              const isTaken = takenAvatars.has(id);
              const isSelected = avatar === id;
              return (
                <PixelButton
                  key={id}
                  variant={isSelected ? 'primary' : 'ghost'}
                  onClick={makeSelectAvatar(id)}
                  aria-label={id}
                  style={{ padding: 'var(--cb-s1)', position: 'relative' }}
                >
                  <Sprite
                    name={`avatar-${id}`}
                    size={32}
                    style={isTaken ? { filter: 'grayscale(1)', opacity: 0.5 } : {}}
                  />
                  {isTaken && (
                    <Sprite
                      name="ui-lock"
                      size={12}
                      style={{ position: 'absolute', top: 2, right: 2 }}
                    />
                  )}
                </PixelButton>
              );
            })}
          </div>

          {taken && (
            <p style={{ margin: 0, color: 'var(--cb-red)', fontSize: 'var(--cb-fs-small)' }}>
              {taken}
            </p>
          )}

          <PixelPanel style={{ display: 'grid', gap: 'var(--cb-s3)' }}>
            <input
              style={inputStyle}
              placeholder={t('setup.names.p1')}
              value={name1}
              onChange={handleName1}
              autoFocus
              maxLength={16}
            />
            <input
              style={inputStyle}
              placeholder={t('setup.names.p2')}
              value={name2}
              onChange={handleName2}
              maxLength={16}
            />
          </PixelPanel>

          {error && (
            <p style={{ margin: 0, color: 'var(--cb-red)', fontSize: 'var(--cb-fs-small)' }}>
              {error}
            </p>
          )}

          <PixelButton variant="gold" block onClick={handleConfirmCouple}>
            {count !== null && coupleIdx + 1 >= count ? t('setup.ready') : t('common.next')}
          </PixelButton>
        </>
      )}
    </Screen>
  );
};
