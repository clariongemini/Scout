import { BaseAdapter } from './BaseAdapter';
import { PlayerUUID } from '../engine/IdentityResolver';
import * as cheerio from 'cheerio';
import axios from 'axios';

// Transfermarkt position number → Turkish label map
const TM_POSITIONS: Record<string, string> = {
  '1': 'Kaleci',
  '2': 'Sağ Bek',
  '3': 'Sol Bek',
  '4': 'Sağ Stoper',
  '5': 'Sol Stoper',
  '6': 'Defansif Orta Saha',
  '7': 'Sağ Kanat',
  '8': 'Sol Kanat',
  '9': 'İleri Orta Saha',
  '10': 'Orta Forvet',
  '11': 'Ofansif Orta Saha',
  '12': 'Sağ Kanat Santrafor',
  '13': 'Sol Kanat Santrafor',
  '14': 'İkinci Golcü',
  '15': 'Sağ Orta Saha',
  '16': 'Sol Orta Saha',
  '17': 'Ön Libero',
};

const TM_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/html, */*',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
};

export class TransfermarktAdapter extends BaseAdapter {
  
  public async getPlayerData(uuid: PlayerUUID): Promise<any> {
    let playerId = uuid.transfermarkt_id;
    let url = '';
    
    // If full URL is stored in uuid.transfermarkt, extract ID from it
    if (!playerId && uuid.transfermarkt) {
      const m = uuid.transfermarkt.match(/spieler\/(\d+)/);
      if (m) playerId = m[1];
      url = uuid.transfermarkt;
    }
    
    if (playerId && !url) {
      url = `https://www.transfermarkt.com.tr/player/profil/spieler/${playerId}`;
    }

    if (!url && !playerId) {
      // Attempt search if no ID provided
      const searchUrl = `https://www.transfermarkt.com.tr/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(uuid.name)}`;
      const searchContext = {
        provider: 'transfermarkt',
        resourceType: 'search',
        sourceEntityId: encodeURIComponent(uuid.name),
        ttlHours: 24
      };
      const $ = await this.fetchHtml(searchUrl, searchContext);
      if ($) {
        const firstMatch = $('.items tbody tr.odd td.hauptlink a').first();
        const href = firstMatch.attr('href');
        if (href) {
          url = `https://www.transfermarkt.com.tr${href}`;
          const match = href.match(/spieler\/(\d+)/);
          if (match) playerId = match[1];
        }
      }
    }

    if (!url) {
      console.log(`Transfermarkt: Could not find player ${uuid.name}`);
      return null;
    }

    const context = {
      provider: 'transfermarkt',
      resourceType: 'player_profile',
      sourceEntityId: playerId || encodeURIComponent(uuid.name),
      ttlHours: 168
    };

    console.log(`Transfermarkt: Fetching ${url}`);
    const $ = await this.fetchHtml(url, context);
    if (!$) return null;

    return this.parseHtml($.html ? $.html() : '', url, uuid, $, playerId);
  }

  public async parseHtml(html: string, url: string, uuid: PlayerUUID, $?: ReturnType<typeof cheerio.load>, playerId?: string): Promise<any> {
    if (!$) {
      $ = cheerio.load(html);
    }
    if (!playerId) {
      const m = url.match(/spieler\/(\d+)/);
      if (m) playerId = m[1];
    }

    // ── 1. İsim ─────────────────────────────────────────────────────────────
    const fullName = $('h1.data-header__headline-wrapper')
      .text().replace(/\n/g, '').replace(/#\d+/g, '').replace(/\s{2,}/g, ' ').trim();

    // ── 2. Mevcut Kulüp (text + logo) ───────────────────────────────────────
    const currentClub = $('img[src*="wappen/kaderquad"]').first().attr('title') ||
      $('.data-header__club-info__club-name a').text().trim() ||
      $('.data-header__club a').text().trim();
    
    // Club logo: kaderquad image
    const clubLogoUrl = $('img[src*="wappen/kaderquad"]').first().attr('src') || '';

    // ── 3. Lig adı + logosu ──────────────────────────────────────────────────
    const leagueName = $('img[src*="verytiny"]').first().attr('title') ||
      $('.data-header__league').text().trim();
    const leagueLogoUrl = $('img[src*="verytiny"]').first().attr('src') || '';

    // ── 4. Uyruk / Bayraklar ─────────────────────────────────────────────────
    // Primary nationality from itemprop="nationality"
    const nationalityFlags: { country: string; flagUrl: string }[] = [];
    $('span[itemprop="nationality"] img, .data-header__label:contains("Uyruk") img').each((_i, el) => {
      const src = $(el).attr('src') || '';
      const title = $(el).attr('title') || $(el).attr('alt') || '';
      if (src && title && !nationalityFlags.find(f => f.country === title)) {
        nationalityFlags.push({ country: title, flagUrl: src });
      }
    });

    // Fallback if none found
    if (nationalityFlags.length === 0) {
      $('img[src*="flagge/tiny"]').each((_i, el) => {
        const src = $(el).attr('src') || '';
        const title = $(el).attr('title') || $(el).attr('alt') || '';
        if (src && title && !nationalityFlags.find(f => f.country === title)) {
          nationalityFlags.push({ country: title, flagUrl: src });
        }
      });
    }

    const primaryNationality = nationalityFlags[0]?.country || $('span[itemprop="nationality"]').text().trim() || '';
    const primaryFlagUrl = nationalityFlags[0]?.flagUrl || '';
    const secondNationality = nationalityFlags[1]?.country || '';

    // ── 5. Info-table – temel bilgiler ───────────────────────────────────────
    let dateOfBirth = '';
    let birthPlace = '';
    let citizenship = '';
    let height = '';
    let foot = '';
    let position = '';
    let contractExpires = '';
    let contractStart = '';
    let shirtNumber = '';
    let agent = '';
    let nationalTeamCaps = '';

    // Parse .data-header__label & .info-table__content
    $('.data-header__label, .info-table__content--regular').each((_i, el) => {
      const label = $(el).text().trim();
      const value = $(el).find('.data-header__content').text().trim() || $(el).next().text().trim();
      
      if (label.includes('Doğum tarihi')) dateOfBirth = value.split(' (')[0];
      if (label.includes('Doğum yeri')) birthPlace = value || $(el).find('[itemprop="birthPlace"]').text().trim();
      if (label.includes('Uyruk')) citizenship = value;
      if (label.includes('Boy')) height = value;
      if (label.includes('Ayak')) foot = value;
      if (label.includes('Mevki')) position = value;
      if (label.includes('Sözleşme sonu')) contractExpires = value;
      if (label.includes('Sözleşme tarihi')) contractStart = value;
      if (label.includes('Milli maç')) nationalTeamCaps = value;
      if (label.includes('Forma')) shirtNumber = value;
      if (label.includes('Temsilci')) agent = value;
    });

    // ── 6. Detaylı Mevki (position field svg / matchfield div) ──────────────
    const primaryPositions: string[] = [];
    const secondaryPositions: string[] = [];

    $('[class*="position--"]').each((_i, el) => {
      const cls = $(el).attr('class') || '';
      const numMatch = cls.match(/position--(\d+)/);
      if (!numMatch) return;
      const posName = TM_POSITIONS[numMatch[1]] || `Pozisyon ${numMatch[1]}`;
      if (cls.includes('position--primary')) {
        primaryPositions.push(posName);
      } else if (cls.includes('position--secondary')) {
        secondaryPositions.push(posName);
      }
    });

    // Also grab the named position labels from the "Baş mevki / Yan mevki" section
    const mainPositionLabels: string[] = [];
    const secondaryPositionLabels: string[] = [];
    let inMainPos = false, inSecPos = false;
    $('dl dt, dl dd').each((_i, el) => {
      const tag = (el as any).tagName?.toLowerCase();
      const text = $(el).text().trim();
      if (tag === 'dt') {
        inMainPos = text.includes('Baş mevki');
        inSecPos = text.includes('Yan mevki');
      } else if (tag === 'dd') {
        if (inMainPos) mainPositionLabels.push(text);
        if (inSecPos) secondaryPositionLabels.push(text);
      }
    });

    // ── 7. Piyasa Değeri ────────────────────────────────────────────────────
    const marketValueText = $('.data-header__market-value-wrapper').text().trim();
    const marketValue = marketValueText
      ? marketValueText.split('Son')[0].trim().replace(/\n/g, '').replace(/\s{2,}/g, ' ')
      : '';

    // ── 8. Oyuncu fotoğrafı ──────────────────────────────────────────────────
    const imageUrl = $('.data-header__profile-image').attr('src') || '';

    // ── 9. Kupalar ──────────────────────────────────────────────────────────
    const trophies: { title: string; count: string }[] = [];
    $('.data-header__badge-container a.data-header__success-data').each((_i, el) => {
      const title = $(el).attr('title') || '';
      const count = $(el).find('.data-header__success-number').text().trim();
      if (title && count && !title.includes('Tüm ün')) {
        trophies.push({ title, count });
      }
    });

    // ── 10. Transfer Geçmişi (ceapi) ────────────────────────────────────────
    let transferHistory: any[] = [];
    try {
      if (playerId) {
        const transferRes = await axios.get(
          `https://www.transfermarkt.com.tr/ceapi/transferHistory/list/${playerId}`,
          { headers: TM_HEADERS, timeout: 8000 }
        );
        if (transferRes.data?.transfers) {
          transferHistory = transferRes.data.transfers.map((t: any) => ({
            season: t.season,
            date: t.date,
            from: t.from?.clubName,
            fromLogoUrl: t.from?.clubLogoUrl,
            to: t.to?.clubName,
            toLogoUrl: t.to?.clubLogoUrl,
            fee: t.fee?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
            marketValue: t.marketValue,
            transferType: t.transferType,
          }));
        }
      }
    } catch (e: any) {
      console.log(`Transfermarkt: Transfer history failed for ${playerId}: ${e.message}`);
    }

    // ── 11. Milli Takım Kariyeri (ceapi) ────────────────────────────────────
    let nationalCareer: any[] = [];
    try {
      if (playerId) {
        const ncRes = await axios.get(
          `https://www.transfermarkt.com.tr/ceapi/player/${playerId}/nationalCareer`,
          { headers: TM_HEADERS, timeout: 8000 }
        );
        if (ncRes.data?.career) {
          nationalCareer = ncRes.data.career.map((c: any) => ({
            teamId: c.team?.teamId,
            flag: c.team?.flag,
            shirtNumber: c.shirtNumber,
            matches: parseInt(c.matches?.count) || 0,
            goals: parseInt(c.goals?.count) || 0,
            debutDate: c.debut?.date ? new Date(c.debut.date * 1000).toLocaleDateString('tr-TR') : '',
            debutResult: c.debut?.result,
          }));
        }
      }
    } catch (e: any) {
      console.log(`Transfermarkt: National career failed for ${playerId}: ${e.message}`);
    }

    // ── 12. Sakatlık Geçmişi (/verletzungen HTML) ───────────────────────────
    let injuryHistory: any[] = [];
    let injurySummaryBySeason: any[] = [];
    try {
      if (playerId) {
        const slug = url.match(/transfermarkt\.com\.tr\/([^\/]+)\//)?.[1] || 'player';
        const injuryUrl = `https://www.transfermarkt.com.tr/${slug}/verletzungen/spieler/${playerId}`;
        const injContext = { provider: 'transfermarkt', resourceType: 'player_injuries', sourceEntityId: playerId, ttlHours: 72 };
        const inj$ = await this.fetchHtml(injuryUrl, injContext);
        if (inj$) {
          // First table = detail rows
          inj$('table').first().find('tr').each((_i, tr) => {
            const cells = inj$(tr).find('td').map((_j, td) => inj$(td).text().trim().replace(/\s+/g, ' ')).get();
            if (cells.length >= 5) {
              injuryHistory.push({
                season: cells[0],
                injury: cells[1],
                from: cells[2],
                until: cells[3],
                days: parseInt(cells[4]) || 0,
                matchesMissed: parseInt(cells[5]) || 0,
              });
            }
          });
          // Second table = season summary
          inj$('table').eq(1).find('tr').each((_i, tr) => {
            const cells = inj$(tr).find('td').map((_j, td) => inj$(td).text().trim().replace(/\s+/g, ' ')).get();
            if (cells.length >= 3) {
              injurySummaryBySeason.push({
                season: cells[0],
                days: parseInt(cells[1]) || 0,
                injuries: parseInt(cells[2]) || 0,
                matchesMissed: parseInt(cells[3]) || 0,
              });
            }
          });
        }
      }
    } catch (e: any) {
      console.log(`Transfermarkt: Injury history failed: ${e.message}`);
    }

    // ── 13. Sezon İstatistikleri (ceapi stats) ─────────────────────────────
    let seasonStats: any = {};
    try {
      if (playerId) {
        const statsRes = await axios.get(
          `https://www.transfermarkt.com.tr/ceapi/player/${playerId}/stats`,
          { headers: TM_HEADERS, timeout: 8000 }
        );
        if (statsRes.data) {
          // Get current season stats
          const currentSeason = statsRes.data[Object.keys(statsRes.data)[0]];
          if (currentSeason) {
            seasonStats = {
              matches: currentSeason.overall?.appearances || 0,
              goals: currentSeason.overall?.goals || 0,
              assists: currentSeason.overall?.assists || 0,
              yellowCards: currentSeason.overall?.yellowCards || 0,
              redCards: currentSeason.overall?.redCards || 0,
              competition: 'Süper Lig' // Default, can be refined
            };
          }
        }
      }
    } catch (e: any) {
      console.log(`Transfermarkt: Season stats failed for ${playerId}: ${e.message}`);
    }

    // ── 14. Detaylı Başarılar (/erfolge HTML) ───────────────────────────────
    let detailedTrophies: any[] = [];
    try {
      if (playerId) {
        const slug = url.match(/transfermarkt\.com\.tr\/([^\/]+)\//)?.[1] || 'player';
        const trophyUrl = `https://www.transfermarkt.com.tr/${slug}/erfolge/spieler/${playerId}`;
        const trophyContext = { provider: 'transfermarkt', resourceType: 'player_trophies', sourceEntityId: playerId, ttlHours: 168 };
        const tr$ = await this.fetchHtml(trophyUrl, trophyContext);
        if (tr$) {
          // Second table has the full list
          let currentTrophy = '';
          let currentCount = '';
          tr$('table').eq(1).find('tr').each((_i, el) => {
            const rowText = tr$(el).text().trim().replace(/\s+/g, ' ');
            // Trophy header row: "4x UEFA Şampiyonlar Ligi katılımcısı"
            const headerMatch = rowText.match(/^(\d+)x\s+(.+)/);
            if (headerMatch) {
              currentCount = headerMatch[1];
              currentTrophy = headerMatch[2].trim();
            } else if (currentTrophy && rowText.length > 3) {
              // Detail row: "25/26 | Club - X Gol"
              const parts = rowText.split('|');
              detailedTrophies.push({
                name: currentTrophy,
                count: currentCount,
                season: parts[0]?.trim(),
                club: parts[1]?.trim(),
              });
            }
          });
          // Also grab first table (individual award)
          tr$('table').first().find('tr').each((_i, el) => {
            const cells = tr$(el).find('td').map((_j, td) => tr$(td).text().trim().replace(/\s+/g, ' ')).get();
            if (cells.length >= 2 && cells[1]) {
              detailedTrophies.unshift({
                name: cells[1],
                count: '1',
                season: cells[0],
                club: '',
              });
            }
          });
        }
      }
    } catch (e: any) {
      console.log(`Transfermarkt: Detailed trophies failed: ${e.message}`);
    }


    return {
      name: fullName || uuid.name,
      currentClub,
      clubLogoUrl,
      leagueName,
      leagueLogoUrl,
      // Uyruk
      primaryNationality,
      primaryFlagUrl,
      secondNationality,
      nationalityFlags,
      // Temel bilgiler
      dateOfBirth,
      birthPlace,
      citizenship,
      height,
      foot,
      position,
      contractExpires,
      contractStart,
      shirtNumber,
      agent,
      nationalTeamCaps,
      marketValue,
      imageUrl,
      // Sezon istatistikleri
      ...seasonStats,
      // Detaylı Mevki
      primaryPositions,
      secondaryPositions,
      mainPositionLabels,
      secondaryPositionLabels,
      // Kupalar & Transferler
      trophies,
      detailedTrophies,
      transferHistory,
      // Milli Takım
      nationalCareer,
      // Sakatlık
      injuryHistory,
      injurySummaryBySeason,
      tmUrl: url,
      tmId: playerId,
    };
  }
}
