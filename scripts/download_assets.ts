import fs from 'fs';
import path from 'path';

async function main() {
  const ranksDir = path.join(process.cwd(), 'public', 'assets', 'ranks');
  const heroesDir = path.join(process.cwd(), 'public', 'assets', 'heroes');

  fs.mkdirSync(ranksDir, { recursive: true });
  fs.mkdirSync(heroesDir, { recursive: true });

  console.log('Downloading Rank icons...');
  for (let i = 0; i <= 8; i++) {
    const rankUrl = `https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_${i}.png`;
    const dest = path.join(ranksDir, `rank_icon_${i}.png`);
    try {
      const res = await fetch(rankUrl);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        fs.writeFileSync(dest, Buffer.from(buffer));
        console.log(`Saved rank_icon_${i}.png`);
      }
    } catch (e) {
      console.error(`Failed ${rankUrl}:`, e);
    }
  }

  console.log('Fetching hero list from OpenDota...');
  const res = await fetch('https://api.opendota.com/api/heroes');
  if (res.ok) {
    const heroes: Array<{ id: number; name: string; localized_name: string }> = await res.json();
    console.log(`Downloading ${heroes.length} hero icons...`);
    for (const hero of heroes) {
      const safeName = hero.name.replace('npc_dota_hero_', '');
      const iconUrl = `https://cdn.steamstatic.com/apps/dota2/images/dota_react/heroes/${safeName}.png`;
      const dest = path.join(heroesDir, `${safeName}.png`);
      if (!fs.existsSync(dest)) {
        try {
          const hRes = await fetch(iconUrl);
          if (hRes.ok) {
            const buf = await hRes.arrayBuffer();
            fs.writeFileSync(dest, Buffer.from(buf));
          }
        } catch (e) {
          console.warn(`Failed hero ${safeName}`);
        }
      }
    }
    console.log('Hero icons download complete!');
  }
}

main().catch(console.error);
