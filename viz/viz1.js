export function drawMedalsVsGdpGraph({ containerSelector, dataByYear, defaultYear }) {
    const margin = { top: 50, right: 20, bottom: 80, left: 80 };
    const ticks = { x: 6, y: 10 };

    const fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-family').trim();
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim();
    const axisTextColor = getComputedStyle(document.documentElement).getPropertyValue('--axis-title-color').trim();

    const container = d3.select(containerSelector + " .graph");
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const continentColors = {
        Europe: "#1f77b4", Asie: "#ff7f0e", Afrique: "#2ca02c", Océanie: "#17becf", Amérique: "#d62728"
    };

    const countryContinentMap = {
        USA: "Amérique", CHN: "Asie", JPN: "Asie", AUS: "Océanie", FRA: "Europe",
        GBR: "Europe", KOR: "Asie", ITA: "Europe", NZL: "Océanie", CAN: "Amérique",
        UZB: "Asie", HUN: "Europe", ESP: "Europe", SWE: "Europe", KEN: "Afrique",
        NOR: "Europe", IRL: "Europe", BRA: "Amérique", UKR: "Europe", ROU: "Europe",
        GEO: "Europe", BEL: "Europe", SRB: "Europe", CZE: "Europe", AZE: "Asie",
        BRN: "Asie", AUT: "Europe", HKG: "Asie", ISR: "Asie", POL: "Europe",
        KAZ: "Asie", JAM: "Amérique", THA: "Asie", ETH: "Afrique", ECU: "Amérique",
        ARG: "Amérique", EGY: "Afrique", TUN: "Afrique", CHI: "Amérique",
        LCA: "Amérique", UGA: "Afrique", DOM: "Amérique", MAR: "Afrique",
        DMA: "Amérique", PAK: "Asie", TUR: "Europe", MEX: "Amérique", ARM: "Asie",
        COL: "Amérique", KGZ: "Asie", LTU: "Europe", IND: "Asie", MDA: "Europe",
        CYP: "Europe", JOR: "Asie", PAN: "Amérique", TJK: "Asie", ALB: "Europe",
        CPV: "Afrique", CIV: "Afrique", PER: "Amérique", QAT: "Asie", SGP: "Asie",
        SVK: "Europe", FIN: "Europe", BLR: "Europe", EST: "Europe", SMR: "Europe",
        MKD: "Europe", TKM: "Asie", SYR: "Asie", GHA: "Afrique", CUB: "Amérique",
        LIE: "Europe", LAT: "Europe", RUS: "Europe", DEU: "Europe", NED: "Europe",
        NLD: "Europe", CHE: "Europe", POR: "Europe", SVN: "Europe"
    };

    const getColorByCountryCode = (code) => {
        const continent = countryContinentMap[code];
        return continentColors[continent] || "#999";
    };

    container.selectAll("*").remove();

    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "100%")
        .style("font-family", fontFamily)
        .style("color", textColor);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = container.append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("padding", "8px")
        .style("background", "var(--secondary-color)")
        .style("border", "1px solid var(--text-color)")
        .style("color", "var(--text-color)")
        .style("border-radius", "4px")
        .style("font-size", "14px")
        .style("pointer-events", "none")
        .style("opacity", 0);

    const allData = Object.values(dataByYear).flat();
    const maxPopulation = d3.max(allData, d => d.population);
    const minPopulation = Math.max(1, d3.min(allData, d => d.population));
    const maxGdp = d3.max(allData, d => d.gdp);
    const minGdp = Math.max(1, d3.min(allData, d => d.gdp));
    const minPopulationRounded = Math.pow(10, Math.floor(Math.log10(minPopulation)));
    const minGdpRounded = Math.pow(10, Math.floor(Math.log10(minGdp)));

    const tickValuesPopulation = d3.range(
        Math.floor(Math.log10(minPopulationRounded)),
        Math.ceil(Math.log10(maxPopulation)) + 1
    ).map(d => Math.pow(10, d));

    const tickValuesGdp = d3.range(
        Math.floor(Math.log10(minGdpRounded)),
        Math.ceil(Math.log10(maxGdp)) + 1
    ).map(d => Math.pow(10, d));

    const xScales = {
        population: d3.scaleLog()
            .domain([minPopulationRounded, maxPopulation * 1.1])
            .range([0, innerWidth * 0.9])
            .base(10),
        gdp: d3.scaleLog()
            .domain([minGdpRounded, maxGdp * 1.1])
            .range([0, innerWidth * 0.9])
            .base(10)
    };

    const yScales = {};
    Object.entries(dataByYear).forEach(([year, yearData]) => {
        const maxMedals = d3.max(yearData, d => d.total);
        yScales[year] = d3.scaleLinear()
            .domain([0, Math.ceil(maxMedals / 10) * 10])
            .range([innerHeight, 0]);
    });

    const xAxisGroup = g.append("g").attr("transform", `translate(0,${innerHeight})`);
    const yAxisGroup = g.append("g");
    const xGridGroup = g.append("g").attr("class", "x-grid").attr("transform", `translate(0,${innerHeight})`);
    const yGridGroup = g.append("g").attr("class", "y-grid");

    const xAxisLabel = g.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + margin.bottom - 35)
        .attr("text-anchor", "middle")
        .attr("class", "x-axis-label")
        .style("fill", axisTextColor)
        .style('font-family', 'Inter')
        .style("font-weight", "bold")
        .style("font-size", "18px")
        .text("Population du pays");

    g.append("text")
        .attr("x", -innerHeight / 2)
        .attr("y", -margin.left + 20)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .style("fill", axisTextColor)
        .style('font-family', 'Inter')
        .style("font-weight", "bold")
        .style("font-size", "18px")
        .text("Nombre de médailles");

    let currentMode = "population";

    function updateGraphForRange(mode, minYear, maxYear) {
        let aggregatedData = [];
        Object.entries(dataByYear).forEach(([year, records]) => {
            const y = +year;
            if (y >= minYear && y <= maxYear) {
                aggregatedData = aggregatedData.concat(records);
            }
        });

        const aggregatedByCountry = Array.from(
            d3.rollup(aggregatedData,
                records => ({
                    country: records[0].country,
                    countryCode: records[0].countryCode,
                    total: d3.sum(records, d => d.total),
                    gdp: records[records.length - 1].gdp,
                    population: records[records.length - 1].population
                }),
                d => d.countryCode
            ),
            ([, data]) => data
        );

        const maxMedals = d3.max(aggregatedByCountry, d => d.total) || 10;
        const yScale = d3.scaleLinear()
            .domain([0, Math.ceil(maxMedals / 10) * 10])
            .range([innerHeight, 0]);

        const xScale = currentMode === 'gdp' ? xScales.gdp : xScales.population;
        const tickValues = currentMode === 'gdp' ? tickValuesGdp : tickValuesPopulation;

        const xAxis = d3.axisBottom(xScale)
            .tickValues(tickValues)
            .tickFormat(d3.format("~s"));
        xAxisGroup.transition().duration(500).call(xAxis);

        const xGrid = d3.axisBottom(xScale)
            .tickValues(tickValues)
            .tickSize(-innerHeight)
            .tickFormat("");
        xGridGroup.transition().duration(500).call(xGrid)
            .call(g => g.selectAll("line").style("stroke", textColor).style("opacity", 0.2))
            .call(g => g.select(".domain").remove());

        const yAxis = d3.axisLeft(yScale).ticks(ticks.y);
        yAxisGroup.transition().duration(500).call(yAxis);

        const yGrid = d3.axisLeft(yScale)
            .ticks(ticks.y)
            .tickSize(-innerWidth)
            .tickFormat("");
        yGridGroup.transition().duration(500).call(yGrid)
            .call(g => g.selectAll("line").style("stroke", textColor).style("opacity", 0.2))
            .call(g => g.select(".domain").remove());

        xAxisLabel.text(currentMode === "gdp" ? "PIB du pays (log)" : "Population du pays (log)");

        const circles = g.selectAll("circle")
            .data(aggregatedByCountry.filter(d => getColorByCountryCode(d.countryCode) !== "#999"), d => d.countryCode);

        circles.exit().transition().duration(250)
            .style("opacity", 0)
            .remove();

        circles.transition().duration(250)
            .attr("cx", d => xScale(d[currentMode]))
            .attr("cy", d => yScale(d.total));

        circles.enter()
            .append("circle")
            .attr("r", 6)
            .attr("fill", d => getColorByCountryCode(d.countryCode))
            .attr("stroke", textColor)
            .attr("stroke-width", 1)
            .attr("cx", d => xScale(d[currentMode]))
            .attr("cy", d => yScale(d.total))
            .style("opacity", 0)
            .on("mouseover", (event, d) => {
                tooltip.style("opacity", 1)
                    .html(`<strong>${d.country}</strong><br>Médailles: ${d.total}`);
            })
            .on("mousemove", event => {
                const bounds = container.node().getBoundingClientRect();
                tooltip.style("left", `${event.clientX - bounds.left + 10}px`)
                    .style("top", `${event.clientY - bounds.top - 30}px`);
            })
            .on("mouseout", () => tooltip.style("opacity", 0))
            .transition().duration(250)
            .style("opacity", 1);
    }

    document.querySelectorAll(".toggle-button").forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".toggle-button").forEach(b => b.classList.remove("active"));
            button.classList.add("active");
            currentMode = button.dataset.mode;
            const [minYear, maxYear] = slider.noUiSlider.get().map(v => parseInt(v));
            updateGraphForRange(currentMode, minYear, maxYear);
        });
    });

    const slider = document.getElementById("yearRange");
    noUiSlider.create(slider, {
        start: [2016, 2022],
        connect: true,
        step: 2,
        orientation: 'vertical',
        direction: 'rtl',
        range: {
            min: 2010,
            max: 2022
        },
        format: {
            to: value => Math.round(value),
            from: value => Math.round(value)
        },
        pips: {
            mode: 'values',
            values: [2010, 2012, 2014, 2016, 2018, 2020, 2022],
            density: 100,
            stepped: true
        }
    });

    const rangeLabel = document.getElementById("rangeLabel");
    slider.noUiSlider.on('update', function (values) {
        const [minYear, maxYear] = values.map(v => parseInt(v));
        if (rangeLabel) {
            rangeLabel.textContent = `Years: ${minYear} – ${maxYear}`;
        }
        updateGraphForRange(currentMode, minYear, maxYear);
    });

    const legendSquareSize = 12;
    const legendSpacingX = 120;
    const continents = Object.keys(continentColors);
    const legendTotalWidth = continents.length * legendSpacingX;
    const legendStartX = (width - legendTotalWidth) / 2;

    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${legendStartX}, ${margin.top - 30})`);

    const legendItems = legend.selectAll(".legend-item")
        .data(continents)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(${i * legendSpacingX}, 0)`);

    legendItems.append("rect")
        .attr("width", legendSquareSize)
        .attr("height", legendSquareSize)
        .attr("fill", d => continentColors[d])
        .attr("stroke", textColor)
        .attr("stroke-width", 1);

    legendItems.append("text")
        .attr("x", legendSquareSize + 6)
        .attr("y", legendSquareSize - 2)
        .style("font-size", "14px")
        .style("fill", textColor)
        .style("font-family", fontFamily)
        .text(d => d);
}