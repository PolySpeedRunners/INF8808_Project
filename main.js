import { loadMedalData, loadGdpByYear, loadPopulationByYear, joinDatasets, loadResults, loadDemography, loadGenc } from './DataReader.js';
import { drawMedalsVsGdpGraph } from './viz/viz1.js';
import { drawRadarChart } from './viz/viz2.js';
import { drawBarChart, populateYearAndDisciplineOptions } from './viz/viz3.js';
import { formatDemography, addDemographyData } from './preprocess.js';

Promise.all([
    loadMedalData('data/medals_2024.csv'),
    loadGdpByYear('data/gdp_per_country.csv', '2023'),
    loadPopulationByYear('data/population_by_country.csv', '2023'),
    loadDemography('data/all/demography.csv'),
    loadGenc('data/all/genc_regions.csv'),
    loadResults('data/all/results.csv', 'data/all/noc_regions.csv', 'data/all/gdp.csv', 'data/all/populations.csv')
]).then(([medals, gdp, population, demography, genc, results]) => {
    const fullData = joinDatasets(medals, gdp, population)
    .filter(d => d.gdp >= 2); 
    drawMedalsVsGdpGraph({
        containerSelector: '#section1',
        data: fullData
    });
    const resultsData = results;
    const demographyData = demography;
    const gencData = genc;
    const formattedDemographyData = formatDemography(demographyData, gencData);
    addDemographyData(resultsData,formattedDemographyData);
    drawRadarChart({
        containerSelector: '#section2',
        data: resultsData,
        yearSeason:"2000,Summer",
        countryCode: "USA"
    });
    populateYearAndDisciplineOptions(resultsData);
    drawBarChart({
        containerSelector: "#section3",
        data: resultsData,
        yearSeason: "2000,Summer",
        discipline: "Archery"
      });

});
