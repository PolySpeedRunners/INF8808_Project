import {
  cleanNullValues,
  convertYearToInt,
  filterByYear,
  filterNonOlympics,
  groupByYear,
  computeDisciplineScoresByCountry,
  findAndFixMissingCountries,
  addPopulationToMedalData,
  addGDPToMedalData,
  computeAthletesByCountryAndYear,
  addAthleteCountToMedalData
} from './preprocess.js';

/**
 * Loads and parses a demography data CSV file.
 *
 * @param {string} csvPath - The path to the demography data CSV file.
 * @returns {Promise<object[]>} A promise that resolves to an array of demography data objects.
 */
export async function loadDemography (csvPath) {
  return d3.csv(csvPath).then(data => {
    return data.map(d => {
      return {
        year: d.YEAR,
        genc: d.GEO_ID,
        tfr: d.TFR,
        pop: d.POP,
        pop15_19: d.POP15_19,
        pop20_24: d.POP20_24,
        deaths: d.DEATHS
      };
    });
  });
}

/**
 * Loads a GENC country mapping CSV file.
 *
 * @param {string} csvPath - The path to the GENC CSV file.
 * @returns {Promise<object[]>} A promise that resolves to an array of country mapping objects.
 */
export async function loadGenc (csvPath) {
  return d3.csv(csvPath).then(data => {
    return data.map(d => {
      return {
        countryName: d['COUNTRY NAME'],
        genc: d['GENC DIGRAPH'],
        iso3: d['LEGACY ISO 3']
      };
    });
  });
}

/**
 * Loads, processes, and enriches Olympic results data.
 *
 * @param {string} resultsPath - Path to the Olympic results CSV file.
 * @param {string} nocPath - Path to the NOC region mapping CSV file.
 * @param {string} gdpPath - Path to the GDP data CSV file.
 * @param {string} populationPath - Path to the population data CSV file.
 * @returns {Promise<object>} A promise that resolves to the merged results data grouped by year-season.
 */
export async function loadResults (resultsPath, nocPath, gdpPath, populationPath) {
  let resultsData = await d3.csv(resultsPath);
  const athletesByCountryYear = computeAthletesByCountryAndYear(resultsData);
  resultsData = cleanNullValues(resultsData);
  resultsData = convertYearToInt(resultsData);
  resultsData = filterNonOlympics(resultsData);
  resultsData = filterByYear(resultsData, 2000);
  resultsData = groupByYear(resultsData);

  const nocRegionsData = await d3.csv(nocPath);
  const nocMap = new Map(nocRegionsData.map((d) => [d.NOC, d.region]));
  const countryMap = new Map(nocRegionsData.map((d) => [d.region, d.NOC]));
  const gdpData = await d3.csv(gdpPath);
  const populationData = await d3.csv(populationPath);
  let retData = computeDisciplineScoresByCountry(resultsData, nocMap);
  findAndFixMissingCountries(gdpData, nocMap, countryMap);
  findAndFixMissingCountries(populationData, nocMap, countryMap);
  retData = addPopulationToMedalData(retData, populationData);
  retData = addGDPToMedalData(retData, gdpData);
  retData = addAthleteCountToMedalData(retData, athletesByCountryYear);
  return retData;
}
