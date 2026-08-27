import { describe, test, expect } from 'bun:test';
import { cleanPlayerName, normalizeName, CellValue } from '../../utils/claritySheet';

describe('clarityAdapter captain extraction logic', () => {
  function simulateFetchCaptainsList(sheetGrid: CellValue[][]): string[] {
    const captains: string[] = [];
    const seen = new Set<string>();
    const ignoreWords = new Set([
      'player', 'players', 'mmr', 'dotabuff', 'db', 'link', 'db link', 'coins', 'average', 'avg',
      'total', 'rank', 'sub', 'subs', 'substitutes', 'team', 'captain', 'captains', 'division',
      'score', 'wins', 'losses', 'tier', 'status', 'unranked', 'tbd', 'open', 'pos 1', 'pos 2',
      'pos 3', 'pos 4', 'pos 5', 'pos', 'role', 'name', 'account id', 'id', 'role/rank', 'false', 'true',
      'captain name', 'team name', 'coin allocation', 'players still to draft', 'eligible to bid',
      'exhaustion rank', 'draft order', 'fa', 'average mmr', 'averagemmr', 'total mmr', 'division format'
    ]);

    const addCaptain = (rawName: string) => {
      if (!rawName) return;
      const cleaned = cleanPlayerName(rawName);
      const norm = normalizeName(cleaned);
      if (
        cleaned &&
        norm.length >= 2 &&
        !ignoreWords.has(norm) &&
        !norm.startsWith('average') &&
        !norm.startsWith('total') &&
        !/^\d+$/.test(cleaned) &&
        !seen.has(norm)
      ) {
        seen.add(norm);
        captains.push(cleaned);
      }
    };

    // Extract exactly the Captain row immediately below each "Player" table header
    for (let r = 0; r < sheetGrid.length - 1; r++) {
      for (let c = 0; c < sheetGrid[r].length; c++) {
        const rawText = (sheetGrid[r][c]?.text || '').trim();
        const normHeader = normalizeName(rawText);

        if (normHeader === 'player' || normHeader === 'players') {
          const capCell = (sheetGrid[r + 1]?.[c]?.text || '').trim();
          addCaptain(capCell);
        }
      }
    }

    return captains;
  }

  test('extracts all 6 captains from multi-column dual-row sheet layout', () => {
    // Recreates the real Division 4 sheet structure
    const mockGrid: CellValue[][] = [
      // Row 0: Column headers (including Row 0 Player headers for left and right blocks)
      [
        { text: 'Player' }, { text: 'MMR' }, { text: 'Dotabuff' }, { text: 'Coins' }, { text: 'FA' }, { text: 'Dotabuff' },
        { text: 'Player' }, { text: 'MMR' }, { text: 'Dotabuff' }, { text: 'Coins' }, { text: 'FA' }, { text: 'Dotabuff' }
      ],
      // Row 1: Captains 1 & 2
      [
        { text: 'levver' }, { text: '2950' }, { text: 'DB Link' }, { text: '0' }, { text: '' }, { text: '' },
        { text: 'Notre Daan' }, { text: '3241' }, { text: 'DB Link' }, { text: '0' }, { text: '' }, { text: '' }
      ],
      // Row 2: Teammates (thronplunder, reload)
      [
        { text: 'thronplunder' }, { text: '4177' }, { text: 'DB Link' }, { text: '39' }, { text: '' }, { text: '' },
        { text: 'reload' }, { text: '3303' }, { text: 'DB Link' }, { text: '43' }, { text: '' }, { text: '' }
      ],
      // Row 3: Teammates
      [
        { text: 'adys' }, { text: '3640' }, { text: 'DB Link' }, { text: '28' }, { text: '' }, { text: '' },
        { text: 'Angra MainYu' }, { text: '2164' }, { text: 'DB Link' }, { text: '2' }, { text: '' }, { text: '' }
      ],
      // Row 4: Teammates
      [
        { text: 'Sourssa' }, { text: '2714' }, { text: 'DB Link' }, { text: '5' }, { text: '' }, { text: '' },
        { text: 'Na1a' }, { text: '1418' }, { text: 'DB Link' }, { text: '0' }, { text: '' }, { text: '' }
      ],
      // Row 5: Teammates
      [
        { text: 'Shion' }, { text: '2440' }, { text: 'DB Link' }, { text: '19' }, { text: '' }, { text: '' },
        { text: 'Rowannn' }, { text: '1900' }, { text: 'DB Link' }, { text: '28' }, { text: '' }, { text: '' }
      ],
      // Row 6: Average MMR row
      [
        { text: 'Average MMR:' }, { text: '2925' }, { text: '' }, { text: '' }, { text: '' }, { text: '' },
        { text: 'Average MMR:' }, { text: '2664' }, { text: '' }, { text: '' }, { text: '' }, { text: '' }
      ],
      // Row 7: Team title rows
      [
        { text: 'Team Tanaka' }, { text: '' }, { text: '' }, { text: '' }, { text: '' }, { text: '' },
        { text: 'Division 5 team' }, { text: '' }, { text: '' }, { text: '' }, { text: '' }, { text: '' }
      ],
      // Row 8: Next Player headers
      [
        { text: 'Player' }, { text: 'MMR' }, { text: 'Dotabuff' }, { text: 'Coins' }, { text: 'FA' }, { text: 'Dotabuff' },
        { text: 'Player' }, { text: 'MMR' }, { text: 'Dotabuff' }, { text: 'Coins' }, { text: 'FA' }, { text: 'Dotabuff' }
      ],
      // Row 9: Captains 3 & 4
      [
        { text: 'Tanaka' }, { text: '2326' }, { text: 'DB Link' }, { text: '0' }, { text: '' }, { text: '' },
        { text: 'Cienszki' }, { text: '3157' }, { text: 'DB Link' }, { text: '0' }, { text: '' }, { text: '' }
      ],
      // Row 10: Teammates
      [
        { text: 'Pajazo' }, { text: '3864' }, { text: 'DB Link' }, { text: '36' }, { text: '' }, { text: '' },
        { text: 'Spamm3r' }, { text: '3679' }, { text: 'DB Link' }, { text: '33' }, { text: '' }, { text: '' }
      ],
      // Row 11: Summary
      [
        { text: 'Average MMR:' }, { text: '2953' }, { text: '' }, { text: '' }, { text: '' }, { text: '' },
        { text: 'Average MMR:' }, { text: '2956' }, { text: '' }, { text: '' }, { text: '' }, { text: '' }
      ],
      // Row 12: Next Player headers
      [
        { text: 'Player' }, { text: 'MMR' }, { text: 'Dotabuff' }, { text: 'Coins' }, { text: 'FA' }, { text: 'Dotabuff' },
        { text: 'Player' }, { text: 'MMR' }, { text: 'Dotabuff' }, { text: 'Coins' }, { text: 'FA' }, { text: 'Dotabuff' }
      ],
      // Row 13: Captains 5 & 6
      [
        { text: 'Bernard humperdink' }, { text: '986' }, { text: 'DB Link' }, { text: '0' }, { text: '' }, { text: '' },
        { text: 'Ben or NapTime' }, { text: '2100' }, { text: 'DB Link' }, { text: '0' }, { text: '' }, { text: '' }
      ]
    ];

    const captains = simulateFetchCaptainsList(mockGrid);

    expect(captains).toHaveLength(6);
    expect(captains).toEqual([
      'levver',
      'Notre Daan',
      'Tanaka',
      'Cienszki',
      'Bernard humperdink',
      'Ben or NapTime'
    ]);
  });

  test('excludes teammates, team names, summary labels, and boolean cells', () => {
    const mockGrid: CellValue[][] = [
      [{ text: 'Draft Order' }, { text: 'Captain Name' }, { text: 'Team Name' }, { text: 'Player' }, { text: 'MMR' }],
      [{ text: '1' }, { text: 'levver' }, { text: 'Disciples of Bogg Shuggoth' }, { text: 'levver' }, { text: '2950' }],
      [{ text: 'FALSE' }, { text: '' }, { text: '' }, { text: 'thronplunder' }, { text: '4177' }],
      [{ text: '' }, { text: '' }, { text: '' }, { text: 'Average MMR:' }, { text: '2925' }]
    ];

    const captains = simulateFetchCaptainsList(mockGrid);
    expect(captains).toEqual(['levver']);
    expect(captains).not.toContain('thronplunder');
    expect(captains).not.toContain('Disciples of Bogg Shuggoth');
    expect(captains).not.toContain('Average MMR:');
    expect(captains).not.toContain('FALSE');
  });
});
