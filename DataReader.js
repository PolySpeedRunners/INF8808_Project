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