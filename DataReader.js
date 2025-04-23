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
} from "./preprocess.js";

export async function loadDemography(csvPath) {
    return d3.csv(csvPath).then(data => {
        return data.map(d => {
            return {
                year: d["YEAR"],
                genc: d["GEO_ID"],
                tfr: d["TFR"],
                pop: d["POP"],
                pop15_19: d["POP15_19"],
                pop20_24: d["POP20_24"],
                deaths: d["DEATHS"]
            };
        });
    });
}

export async function loadGenc(csvPath) {
    return d3.csv(csvPath).then(data => {
        return data.map(d => {
            return {
                countryName: d["COUNTRY NAME"],
                genc: d["GENC DIGRAPH"],
                iso3: d["LEGACY ISO 3"]
            };
        });
    });
}

export async function loadResults(resultsPath, nocPath, gdpPath, populationPath) {
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
    let gdpData = await d3.csv(gdpPath); // NEEDS DATA ClEANING
    let populationData = await d3.csv(populationPath); // NEEDS DATA CLEANING
    let retData = computeDisciplineScoresByCountry(resultsData, nocMap); // TO KEEP, BETTER THAN resultsWithCountryNames
    // NEEDS TO FIX COUNTRIES LIKE RUSSIA AND GERMANY
    findAndFixMissingCountries(gdpData, nocMap, countryMap);
    findAndFixMissingCountries(populationData, nocMap, countryMap);
    retData = addPopulationToMedalData(retData, populationData);
    retData = addGDPToMedalData(retData, gdpData);
    retData = addAthleteCountToMedalData(retData, athletesByCountryYear);
    return retData;
}