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
// Load medals CSV
export async function loadMedalData(csvPath) {
    return d3.csv(csvPath, d => {
        return {
            countryCode: d["country_code"],
            country: d["country"],
            total: +d["Total"]
        };
    });
}

// Load GDP from a year or a sum of two years
export async function loadGdpByYear(csvPath, year1, year2 = null) {
    return d3.csv(csvPath).then(data => {
        return data.map(d => {
            const gdp1 = +d[year1] || 0;
            const gdp2 = year2 ? (+d[year2] || 0) : 0;
            return {
                country: d["Country Name"],
                countryCode: d["Country Code"],
                gdp: year2 ? gdp1 + gdp2 : gdp1
            };
        });
    });
}

export async function loadPopulationByYear(csvPath, year1, year2 = null) {
    return d3.csv(csvPath).then(data => {
        return data.map(d => {
            const pop1 = +d[year1] || 0;
            const pop2 = year2 ? (+d[year2] || 0) : 0;
            return {
                country: d["Country Name"],
                countryCode: d["Country Code"],
                population: year2 ? pop1 + pop2 : pop1
            };
        });
    });
}

export function joinDatasets(...datasets) {
    if (datasets.length === 0) return [];

    let merged = datasets[0];

    for (let i = 1; i < datasets.length; i++) {
        const nextDataset = datasets[i];
        const map = new Map(nextDataset.map(d => [d.countryCode, d]));

        merged = merged
            .filter(d => map.has(d.countryCode))
            .map(d => ({
                ...d,
                ...map.get(d.countryCode)
            }));
    }

    return merged;
}

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
    retData = addGDPToMedalData(retData, populationData);
    retData = addAthleteCountToMedalData(retData, athletesByCountryYear);
    return retData;
}