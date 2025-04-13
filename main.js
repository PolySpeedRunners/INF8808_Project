import {
    loadMedalData,
    loadGdpByYear,
    loadPopulationByYear,
    joinDatasets
} from './DataReader.js';

import { drawMedalsVsGdpGraph } from './viz/viz1.js';

const defaultYear = 2024;

const yearSlider = document.getElementById("yearRange");
if (yearSlider) yearSlider.value = defaultYear;

const olympicYears = [2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024];

// Load and join medals, GDP, and population for all years
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
        defaultYear: 2024
    });
});
