import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LangProvider } from '@/shared/i18n';
import { SoundApiProvider } from '@/shared/sound';
import { createSoundNoopApi } from '@/shared/sound/api/noop';
import { playerArtUrl } from '@/shared/Chrome';
import { fr } from '@/data/strings.fr';
import { initSetup, reduceSetup } from '../domain/machine';
import { PICKER_TEAMS } from '../domain/pickerTeams';
import { NameEntry } from './NameEntry';

function mountNames(avatarId: (typeof PICKER_TEAMS)[number], name1 = '', name2 = '', confirm = false) {
  let state = reduceSetup(initSetup(), { type: 'pickCount', count: 2 });
  state = reduceSetup(state, { type: 'selectAvatar', avatarId });
  state = reduceSetup(state, { type: 'confirmTeam' });
  state = reduceSetup(state, { type: 'setName', which: 1, value: name1 });
  state = reduceSetup(state, { type: 'setName', which: 2, value: name2 });
  if (confirm) state = reduceSetup(state, { type: 'confirmNames' });
  return render(
    <LangProvider initialLang="fr">
      <SoundApiProvider api={createSoundNoopApi()}>
        <NameEntry state={state} onChangeName={vi.fn()} onConfirm={vi.fn()} />
      </SoundApiProvider>
    </LangProvider>,
  );
}

describe('V-Setup Step B — name avatars', () => {
  it('puts the p1 bust before field 1 and the p2 bust before field 2, resolved by the picked team', () => {
    for (const id of PICKER_TEAMS) {
      const { container, unmount } = mountNames(id);
      const rows = container.querySelectorAll('.cb-v-setup__player');
      expect(rows, id).toHaveLength(2);
      const fields = [fr['setup.names.p1'], fr['setup.names.p2']];
      rows.forEach((row, i) => {
        const slot = (i + 1) as 1 | 2;
        const kids = Array.from(row.children);
        expect(kids[0]?.classList.contains('cb-player-avatar'), `${id} p${slot} avatar first`).toBe(true);
        expect(kids[1]?.tagName).toBe('INPUT');
        expect(kids[1]).toHaveAttribute('placeholder', fields[i]);
        const art = playerArtUrl(id, slot);
        expect(art, `${id} p${slot} art`).toBeDefined();
        expect(kids[0]?.querySelector('img')?.getAttribute('src')).toBe(art);
      });
      unmount();
    }
  });

  it('avatars are decorative: the inputs keep the accessible names, no extra images', () => {
    const { container } = mountNames('foxes');
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
    for (const a of container.querySelectorAll('.cb-player-avatar')) expect(a).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });

  it('the team hero below is still rendered', () => {
    const { container } = mountNames('mice');
    expect(container.querySelector('.cb-v-setup__hero .cb-char')).not.toBeNull();
  });

  it('keeps the field behaviour: autofocus, maxLength 16, no autofill/correct/spellcheck, aria-invalid on error', () => {
    mountNames('lions', '', '', true);
    const [f1, f2] = screen.getAllByRole('textbox');
    for (const f of [f1, f2]) {
      expect(f).toHaveAttribute('maxlength', '16');
      expect(f).toHaveAttribute('autocomplete', 'off');
      expect(f).toHaveAttribute('autocorrect', 'off');
      expect(f).toHaveAttribute('spellcheck', 'false');
      expect(f).toHaveAttribute('aria-invalid', 'true');
    }
    expect(f1).toHaveFocus();
    expect(screen.getByText(fr['setup.names.required'])).toBeInTheDocument();
  });

  it('a player with a long name keeps the full value in the field', () => {
    mountNames('otters', 'Maximilienne-Aa', 'Léo');
    expect(screen.getAllByRole('textbox')[0]).toHaveValue('Maximilienne-Aa');
  });
});
