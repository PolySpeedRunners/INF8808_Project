import { loadResults, loadDemography, loadGenc } from './DataReader.js';
import { drawMedalsVsGdpGraph } from './viz/viz1.js';
import { chooseYearRadarChart } from './viz/viz2.js';
import { drawBarChart, populateYearAndDisciplineOptions } from './viz/viz3.js';
import { drawLineChart, setLineChartListener } from './viz/viz4.js';
import { formatDemography, addDemographyData } from './preprocess.js';

Promise.all([
  loadDemography('data/all/demography.csv'),
  loadGenc('data/all/genc_regions.csv'),
  loadResults('data/all/results.csv', 'data/all/noc_regions.csv', 'data/all/gdp.csv', 'data/all/populations.csv')
]).then(([demography, genc, results]) => {
  const resultsData = results;
  const demographyData = demography;
  const gencData = genc;
  const formattedDemographyData = formatDemography(demographyData, gencData);
  addDemographyData(resultsData, formattedDemographyData);
  drawMedalsVsGdpGraph({
    containerSelector: '#section1',
    data: resultsData,
    defaultYear: 2022
  });
  chooseYearRadarChart(resultsData);
  populateYearAndDisciplineOptions(resultsData);
  drawBarChart({
    containerSelector: '#section3',
    data: resultsData,
    yearSeason: '2022,Winter',
    discipline: 'Alpine Skiing (Skiing)'
  });
  setLineChartListener(resultsData, '#section4', 'Both');
  drawLineChart({ data: resultsData, containerSelector: '#section4' });
});
