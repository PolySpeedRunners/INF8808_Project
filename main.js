import { loadMedalData, loadGdpByYear, loadPopulationByYear, joinDatasets, loadResults } from './DataReader.js';
import { drawMedalsVsGdpGraph } from './viz/viz1.js';
import { drawBarChart } from './viz/viz3.js';

Promise.all([
    loadMedalData('data/medals_2024.csv'),
    loadGdpByYear('data/gdp_per_country.csv', '2023'),
    loadPopulationByYear('data/population_by_country.csv', '2023'),
    loadResults('data/all/results.csv', 'data/all/noc_regions.csv', 'data/all/gdp.csv', 'data/all/populations.csv')
]).then(([medals, gdp, population, results]) => {
    const fullData = joinDatasets(medals, gdp, population)
    .filter(d => d.gdp >= 2); 
    drawMedalsVsGdpGraph({
        containerSelector: '#section1',
        data: fullData
    });
    const resultsData = results;
    drawBarChart({
        containerSelector: "#section3",
        data: resultsData,
        yearSeason: "2020,Summer",
        discipline: "Swimming (Aquatics)"
      });
});
