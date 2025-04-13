import { loadMedalData, loadGdpByYear, loadPopulationByYear, joinDatasets } from './DataReader.js';
import { drawMedalsVsGdpGraph } from './viz/viz1.js';

Promise.all([
    loadMedalData('data/medals_2024.csv'),
    loadGdpByYear('data/gdp_per_country.csv', '2023'),
    loadPopulationByYear('data/population_by_country.csv', '2023')
]).then(([medals, gdp, population]) => {
    const fullData = joinDatasets(medals, gdp, population)
    .filter(d => d.gdp >= 2); 
    drawMedalsVsGdpGraph({
        containerSelector: '#section1',
        data: fullData
    });
});
