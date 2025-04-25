import { MEDAL_VALUES } from './assets/constants.js';

/**
 * Cleans the dataset by removing entries with falsy values for "discipline", "type", or "year".
 *
 * @param {object[]} data The dataset with missing values
 * @returns {object[]} The cleaned dataset
 */
export function cleanNullValues (data) {
  return data.filter((item) => item.discipline && item.type && item.year);
}

/**
 * Converts the "year" field to an integer in the dataset.
 *
 * @param {object[]} data The dataset with year as a string or float
 * @returns {object[]} The dataset with "year" as an integer
 */
export function convertYearToInt (data) {
  return data.map((item) => ({
    ...item,
    year: item.year ? parseInt(item.year, 10) : item.year
  }));
}

/**
 * Filters out entries where the "event" does not contain "(Olympic)".
 *
 * @param {object[]} data The dataset to filter
 * @returns {object[]} The filtered dataset
 */
export function filterNonOlympics (data) {
  return data.filter((item) => item.event.includes('(Olympic)'));
}

/**
 * Filters out entries with the year below the specified year".
 *
 * @param {object[]} data The dataset to filter
 * @param {object[]} year The year to filter
 * @returns {object[]} The filtered dataset
 */
export function filterByYear (data, year) {
  return data.filter((item) => item.year >= year);
}

/**
 * Groups the dataset by the "year" field.
 *
 * @param {object[]} data The dataset to group
 * @returns {object} An object where keys are years and values are arrays of corresponding entries
 */
export function groupByYear (data) {
  return data.reduce((acc, item) => {
    const year = item.year;
    const type = item.type;
    const key = year + ',' + type;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});
}

/**
 * Returns the numeric value of a medal.
 *
 * @param {string} medal - Medal type ('Gold', 'Silver', 'Bronze')
 * @returns {number} The corresponding numeric value or 0 if not found
 */
export function getMedalValue (medal) {
  return MEDAL_VALUES[medal] || 0;
}
/**
 * Computes total medal scores per country (NOC) for each year-season, avoiding double counting of team events.
 *
 * @param {object} resultsData - Results data grouped by year and season
 * @returns {object} Scores per country for each year-season
 */
export function computeScoresByYearSeason (resultsData) {
  return Object.fromEntries(
    Object.entries(resultsData).map(([key, athletes]) => {
      // Reset added combinations for each year-season key
      const addedCombinations = new Set();

      const nocScores = d3.rollup(
        athletes,
        (group) => {
          return d3.sum(group, (d) => {
            const combination = `${d.discipline}-${d.event}-${d.noc}-${d.medal}`;

            // Prevents team work to be counted multiple times
            if (
              !addedCombinations.has(combination) &&
              getMedalValue(d.medal) > 0
            ) {
              addedCombinations.add(combination);
              return getMedalValue(d.medal);
            }
            return 0;
          });
        },
        (d) => d.noc
      );
      return [key, Object.fromEntries(nocScores)];
    })
  );
}

/**
 * Converts NOC codes to country names using a mapping.
 *
 * @param {object} results - Medal results keyed by year-season
 * @param {Map} nocMap - Mapping from NOC codes to country names
 * @returns {object} Country scores by year-season
 */
export function convertNocToCountry (results, nocMap) {
  return Object.fromEntries(
    Object.entries(results).map(([yearSeason, nocScores]) => {
      const countryScores = [];
      for (const [noc, score] of Object.entries(nocScores)) {
        const country = nocMap.get(noc) || 'Unknown'; // Fallback to 'Unknown' if NOC isn't found
        countryScores.push({
          countryName: country,
          medals: score
        });
      }
      return [yearSeason, countryScores];
    })
  );
}

/**
 * Computes detailed discipline-level medal scores per country per year-season.
 *
 * @param {object} resultsData - Results data grouped by year-season
 * @param {Map} nocMap - Mapping from NOC to country name
 * @returns {object} Medal stats including disciplines and total score
 */
export function computeDisciplineScoresByCountry (resultsData, nocMap) {
  return Object.fromEntries(
    Object.entries(resultsData).map(([key, athletes]) => {
      const addedCombinations = new Set();

      const disciplineScores = d3.rollup(
        athletes,
        (group) => {
          const countryName = nocMap.get(group[0].noc) || 'Unknown';

          const result = {
            countryName,
            medalScore: 0,
            totalMedals: 0,
            totalBronze: 0,
            totalSilver: 0,
            totalGold: 0,
            disciplines: {}
          };

          for (const d of group) {
            const combination = `${d.discipline}-${d.event}-${d.noc}-${d.medal}`;
            const medalValue = getMedalValue(d.medal);

            if (!addedCombinations.has(combination) && medalValue > 0) {
              addedCombinations.add(combination);

              if (!result.disciplines[d.discipline]) {
                result.disciplines[d.discipline] = {
                  score: 0,
                  total: 0,
                  gold: 0,
                  silver: 0,
                  bronze: 0
                };
              }

              result.disciplines[d.discipline].total += 1;
              result.disciplines[d.discipline].score += medalValue;
              result.totalMedals += 1;
              result.medalScore += medalValue;

              if (d.medal === 'Gold') {
                result.disciplines[d.discipline].gold += 1;
                result.totalGold += 1;
              } else if (d.medal === 'Silver') {
                result.disciplines[d.discipline].silver += 1;
                result.totalSilver += 1;
              } else if (d.medal === 'Bronze') {
                result.disciplines[d.discipline].bronze += 1;
                result.totalBronze += 1;
              }
            }
          }

          return result;
        },
        (d) => d.noc
      );

      return [key, Object.fromEntries(disciplineScores)];
    })
  );
}

/**
 * Replaces missing or incorrect NOC codes in GDP data using a mapping.
 *
 * @param {object[]} gdpData - Array of GDP data entries
 * @param {Map} nocMap - Map of known NOC codes
 * @param {Map} countryMap - Map of country names to NOC codes
 */
export function findAndFixMissingCountries (gdpData, nocMap, countryMap) {
  // May need to fix noc region csv such as West Germany, East Germany, Russia, etc
  gdpData.forEach((entry) => {
    const countryCode = entry['Country Code'];
    const countryName = entry['Country Name'];

    if (!nocMap.has(countryCode)) {
      if (countryMap.has(countryName)) {
        // Reassign country code based on countryMap
        const newCode = countryMap.get(countryName);
        entry['Country Code'] = newCode;
      }
    }
  });
}

/**
 * Merges additional data into medal data based on year and country/NOC code.
 *
 * @param {object} medalData - Medal data
 * @param {object[]} data - Data array to merge in (e.g., GDP or population)
 * @param {string} dataKey - The key under which to store the new data
 * @param {string} mapKey - The key to use for identifying countries in the merge
 * @returns {object} Updated medalData with merged values
 */
export function addDataToMedalData (medalData, data, dataKey, mapKey) {
  const dataMap = new Map(data.map((entry) => [entry[mapKey], entry]));

  Object.entries(medalData).forEach(([yearSeason, countries]) => {
    const year = yearSeason.split(',')[0];

    Object.entries(countries).forEach(([NOC, countryData]) => {
      const dataEntry =
        dataMap.get(NOC) || dataMap.get(countryData.countryName);
      countryData[dataKey] =
        dataEntry && dataEntry[year]
          ? parseFloat(dataEntry[year]) || null
          : null;
    });
  });

  return medalData;
}

/**
 * Adds population data to the medal dataset.
 *
 * @param {object} medalData - Medal data grouped by year-season
 * @param {object[]} populationData - Population data
 * @returns {object} Updated medal data with population
 */
export function addPopulationToMedalData (medalData, populationData) {
  return addDataToMedalData(
    medalData,
    populationData,
    'population',
    'Country Code'
  );
}

/**
 * Adds GDP data to the medal dataset.
 *
 * @param {object} medalData - Medal data grouped by year-season
 * @param {object[]} gdpData - GDP data
 * @returns {object} Updated medal data with GDP values
 */
export function addGDPToMedalData (medalData, gdpData) {
  return addDataToMedalData(medalData, gdpData, 'gdp', 'Country Code');
}

/**
 * Adds athlete count per year to the medal data.
 *
 * @param {object} medalData - Medal data grouped by year-season
 * @param {object[]} athCountData - Athlete count data
 * @returns {object} Updated medal data with athlete counts
 */
export function addAthleteCountToMedalData (medalData, athCountData) {
  return addDataToMedalData(medalData, athCountData, 'AthCount', 'Country Code');
}

/**
 * Formats demography data and links it to ISO3 codes and calculates age percentage.
 *
 * @param {object[]} demographyData - Raw demography entries
 * @param {object[]} gencData - Mapping of GENC codes to country/ISO3
 * @returns {object} Formatted and grouped demography data by year and country
 */
export function formatDemography (demographyData, gencData) {
  const gencToCountryMap = new Map();
  gencData.forEach(({ countryName, genc, iso3 }) => {
    gencToCountryMap.set(genc, { countryName, iso3 });
  });
  const groupedData = {};

  demographyData.forEach((item) => {
    const { year, genc } = item;
    const extra = gencToCountryMap.get(genc) || {
      countryName: null,
      iso3: null
    };
    const pop = parseInt(item.pop, 10);
    const pop1519 = parseInt(item.pop15_19, 10);
    const pop2024 = parseInt(item.pop20_24, 10);
    const percentage = ((pop1519 + pop2024) / pop) * 100;

    const plusItem = {
      ...item,
      countryName: extra.countryName,
      iso3: extra.iso3,
      percentage: percentage
    };

    if (!groupedData[year]) {
      groupedData[year] = {};
    }

    if (!groupedData[year][extra.iso3]) {
      groupedData[year][extra.iso3] = plusItem;
    }
  });

  return groupedData;
}

/**
 * Adds demographic indicators to results data (e.g., TFR, youth percentage, population).
 *
 * @param {object} resultsData - Medal data
 * @param {object} formattedDemographyData - Formatted demographic data
 */
export function addDemographyData (resultsData, formattedDemographyData) {
  for (const yearSeason in resultsData) {
    const [yearOnly] = yearSeason.split(',');
    const demographyByGenc = formattedDemographyData[yearOnly];
    if (!demographyByGenc) continue;

    const countries = resultsData[yearSeason];

    for (const noc in countries) {
      const country = demographyByGenc[noc];

      if (!country) {
        countries[noc].tfr = 0;
        countries[noc].percentage = 0;
        continue;
      }

      const demography = demographyByGenc[noc];
      if (demography.tfr) {
        countries[noc].tfr = parseFloat(demography.tfr);
      }
      countries[noc].tfr = demography.tfr ? parseFloat(demography.tfr) : 0;
      countries[noc].percentage = demography.percentage ? parseFloat(demography.percentage) : 0;
      countries[noc].population = demography.pop ? parseInt(demography.pop, 10) : 0;
    }
  }
}

/**
 * Computes the number of unique athletes per country and year.
 *
 * @param {object[]} resultsData - Raw results dataset
 * @returns {object[]} Array of objects with athlete counts per country and year
 */
export function computeAthletesByCountryAndYear (resultsData) {
  const athleteMap = new Map();

  resultsData.forEach((entry) => {
    const year = entry.year;
    const noc = entry.noc;
    const athlete = entry.athlete_id;

    if (!year || !noc || !athlete) return;

    if (!athleteMap.has(noc)) {
      athleteMap.set(noc, { 'Country Code': noc });
    }

    const countryEntry = athleteMap.get(noc);

    if (!countryEntry[year]) {
      countryEntry[year] = new Set();
    }

    countryEntry[year].add(athlete);
  });

  // Convert Sets to counts
  const result = [];
  athleteMap.forEach((entry) => {
    const flatEntry = { 'Country Code': entry['Country Code'] };
    Object.entries(entry).forEach(([key, value]) => {
      if (key !== 'Country Code') {
        flatEntry[key] = value.size;
      }
    });
    result.push(flatEntry);
  });

  return result;
}
