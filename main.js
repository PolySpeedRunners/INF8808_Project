import { loadMedalData, loadGdpByYear, loadPopulationByYear, joinDatasets, loadResults, loadDemography, loadGenc } from './DataReader.js';
import { drawMedalsVsGdpGraph } from './viz/viz1.js';
import { chooseYearRadarChart } from './viz/viz2.js';
import { drawBarChart, populateYearAndDisciplineOptions } from './viz/viz3.js';
import { formatDemography, addDemographyData } from './preprocess.js';

const olympicYears = [2010, 2012, 2014, 2016, 2018, 2020, 2022];

async function loadAllDataForYears(years) {
    const results = {};

    await Promise.all(years.map(async (year) => {
        const [medals, gdp, population] = await Promise.all([
            loadMedalData(`data/medals_${year}.csv`),
            loadGdpByYear('data/gdp_per_country.csv', `${year}`),
            loadPopulationByYear('data/population_by_country.csv', `${year}`)
        ]);

        results[year] = joinDatasets(medals, gdp, population)
            .filter(d => d.gdp >= 2 && d.total > 0)
            .sort((a, b) => b.total - a.total)
            .map((d, i) => ({ ...d, year, rank: i + 1 }));


        console.log(`Data for ${year} loaded`);
        console.log(`Medals: ${medals.length}, GDP: ${gdp.length}, Population: ${population.length}`);
    }));

    return results;
}

// Load and initialize graph
loadAllDataForYears(olympicYears).then((joinedDataByYear) => {
    // Expose globally in case it's needed later
    window.olympicsDataByYear = joinedDataByYear;

    // Initial render
    drawMedalsVsGdpGraph({
        containerSelector: '#section1',
        dataByYear: joinedDataByYear,
        defaultYear: 2022
    });
});

Promise.all([
    loadDemography('data/all/demography.csv'),
    loadGenc('data/all/genc_regions.csv'),
    loadResults('data/all/results.csv', 'data/all/noc_regions.csv', 'data/all/gdp.csv', 'data/all/populations.csv')
]).then(([demography, genc, results]) => {
    const resultsData = results;
    const demographyData = demography;
    const gencData = genc;
    const formattedDemographyData = formatDemography(demographyData, gencData);
    addDemographyData(resultsData,formattedDemographyData);
    chooseYearRadarChart(resultsData)
    populateYearAndDisciplineOptions(resultsData);
    drawBarChart({
        containerSelector: "#section3",
        data: resultsData,
        yearSeason: "2000,Summer",
        discipline: "Archery"
    });
});