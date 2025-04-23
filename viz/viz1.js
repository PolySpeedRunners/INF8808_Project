import { CSS_CONSTANTS as CSS, CONTINENT_LEGEND_COLOR } from "../assets/constants.js";

export function drawMedalsVsGdpGraph({ containerSelector, data, defaultYear }) {
    const ANIMATION_TIME = 500;

    const COUNTRY_TO_CONTINENT_MAP = {
        // Existing entries
        USA: "America", CHN: "Asia", JPN: "Asia", AUS: "Australia", FRA: "Europe",
        GBR: "Europe", KOR: "Asia", ITA: "Europe", NZL: "Australia", CAN: "America",
        UZB: "Asia", HUN: "Europe", ESP: "Europe", SWE: "Europe", KEN: "Africa",
        NOR: "Europe", IRL: "Europe", BRA: "America", UKR: "Europe", ROU: "Europe",
        GEO: "Europe", BEL: "Europe", SRB: "Europe", CZE: "Europe", AZE: "Asia",
        BRN: "Asia", AUT: "Europe", HKG: "Asia", ISR: "Asia", POL: "Europe",
        KAZ: "Asia", JAM: "America", THA: "Asia", ETH: "Africa", ECU: "America",
        ARG: "America", EGY: "Africa", TUN: "Africa", CHI: "America",
        LCA: "America", UGA: "Africa", DOM: "America", MAR: "Africa",
        DMA: "America", PAK: "Asia", TUR: "Europe", MEX: "America", ARM: "Asia",
        COL: "America", KGZ: "Asia", LTU: "Europe", IND: "Asia", MDA: "Europe",
        CYP: "Europe", JOR: "Asia", PAN: "America", TJK: "Asia", ALB: "Europe",
        CPV: "Africa", CIV: "Africa", PER: "America", QAT: "Asia", SGP: "Asia",
        SVK: "Europe", FIN: "Europe", BLR: "Europe", EST: "Europe", SMR: "Europe",
        MKD: "Europe", TKM: "Asia", SYR: "Asia", GHA: "Africa", CUB: "America",
        LIE: "Europe", LAT: "Europe", RUS: "Europe", DEU: "Europe", NED: "Europe",
        NLD: "Europe", CHE: "Europe", POR: "Europe", SVN: "Europe",
        BUL: "Europe", GRE: "Europe", SUI: "Europe", DEN: "Europe", INA: "Asia",
        IRI: "Asia", ALG: "Africa", BAH: "America", NGR: "Africa", RSA: "Africa",
        SLO: "Europe", CRO: "Europe", KSA: "Asia", TTO: "America", CMR: "Africa",
        MOZ: "Africa", URU: "America", SRI: "Asia", CRC: "America", KUW: "Asia",
        ISL: "Europe", BAR: "America", ZIM: "Africa", UAE: "Asia", VEN: "America",
        PAR: "America", MGL: "Asia", ERI: "Africa", SUD: "Africa", SAM: "Oceania",
        MRI: "Africa", TOG: "Africa", AFG: "Asia", PHI: "Asia", KOS: "Europe",
        BDI: "Africa", GRN: "America", GUA: "America", BOT: "Africa", GAB: "Africa",
        MNE: "Europe", NAM: "Africa", BUR: "Africa", PUR: "America", NIG: "Africa",
        BER: "America", FIJ: "Oceania"
    };
    const processedDataByYear = {};

    for (const yearSeasonKey of Object.keys(data)) {
        const [yearStr, season] = yearSeasonKey.split(',');
        const year = parseInt(yearStr);

        const countries = data[yearSeasonKey];
        const yearEntries = Object.entries(countries)
            .filter(([code, d]) => d.gdp >= 2 && d.medalScore > 0)
            .sort((a, b) => b[1].medalScore - a[1].medalScore)
            .map(([code, d], i) => ({
                country: d.countryName,
                countryCode: code,
                gdp: d.gdp,
                population: d.population,
                totalMedals: d.totalMedals,
                medalScore: d.medalScore,
                rank: i + 1,
                year: year
            }));

        if (yearEntries.length > 0) {
            processedDataByYear[year] = yearEntries;
        }
    }

    data = processedDataByYear;

    const availableYears = Object.keys(data).map(Number).sort((a, b) => a - b);
    const latestYear = availableYears[availableYears.length - 1];
    if (!defaultYear || !data[defaultYear]) defaultYear = latestYear;

    const margin = { top: 20, right: 20, bottom: 80, left: 80 };
    const ticks = { x: 6, y: 10 };
    const container = d3.select(containerSelector + " .graph");
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const getColorByCountryCode = (code) => {
        const continent = COUNTRY_TO_CONTINENT_MAP[code];
        return CONTINENT_LEGEND_COLOR[continent] || "#999";
    };

    container.selectAll("*").remove();

    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "100%")
        .style("font-family", CSS.Font)
        .style("color", CSS.TextColor);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top + 30})`);
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

    const maxPopulation = d3.max(Object.values(data).flat(), d => d.population);
    const minPopulation = Math.max(1, d3.min(Object.values(data).flat(), d => d.population));
    const maxGdp = d3.max(Object.values(data).flat(), d => d.gdp);
    const minGdp = Math.max(1, d3.min(Object.values(data).flat(), d => d.gdp));
    const minPopulationRounded = Math.pow(10, Math.floor(Math.log10(minPopulation)));
    const minGdpRounded = Math.pow(10, Math.floor(Math.log10(minGdp)));
    const maxPopulationRounded = Math.pow(10, Math.ceil(Math.log10(maxPopulation)));
    const maxGdpRounded = Math.pow(10, Math.ceil(Math.log10(maxGdp)));

    const tickValuesPopulation = d3.range(
        Math.floor(Math.log10(minPopulationRounded)),
        Math.ceil(Math.log10(maxPopulationRounded))
    ).map(d => Math.pow(10, d));

    const tickValuesGdp = d3.range(
        Math.floor(Math.log10(minGdpRounded)),
        Math.ceil(Math.log10(maxGdpRounded))
    ).map(d => Math.pow(10, d));

    const xScales = {
        population: d3.scaleLog()
            .domain([minPopulationRounded, maxPopulation * 1.1])
            .range([0, innerWidth])
            .base(10),
        gdp: d3.scaleLog()
            .domain([minGdpRounded, maxGdp * 1.1])
            .range([0, innerWidth])
            .base(10)
    };

    const yScales = {};
    Object.entries(data).forEach(([year, yearData]) => {
        const maxMedals = d3.max(yearData, d => d.medalScore);
        yScales[year] = d3.scaleLinear()
            .domain([0, Math.ceil(maxMedals / 10) * 10 + 10])
            .range([innerHeight, 0]);
    });

    const xAxisGroup = g
        .append("g")
        .attr("transform", `translate(0, ${innerHeight})`)

    const yAxisGroup = g
        .append("g")

    const xGridGroup = g
        .append("g")
        .attr("class", "x-grid")
        .attr("transform", `translate(0, ${innerHeight})`)
        .style("color", "var(--button-active-color)")
        .style("opacity", 0.5);
    
    const yGridGroup = g
        .append("g")
        .attr("class", "y-grid")
        .style("color", "var(--button-active-color)")
        .style("opacity", 0.5);

    const xAxisLabel = g.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + margin.bottom - 35)
        .attr("class", "x-axis-label")
        .text("Population du pays");

    g.append("text")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + 20)
      .attr("transform", "rotate(-90)")
      .attr("class", "y-axis-label")
      .text("Medal score");

        //flattent the data, and then print me all instance where a country fails getColorByCountryCode (returns #999)
    const missingCountries = Object.values(data).flat().filter(d => getColorByCountryCode(d.countryCode) === "#999");

    const allCircles = g.selectAll("circle")
        .data(Object.values(data).flat())
        .enter()
        .append("circle")
        .attr("r", 6)
        .attr("fill", d => getColorByCountryCode(d.countryCode))
        .attr("stroke", CSS.TextColor)
        .attr("stroke-width", 1)
        .style("opacity", 0)
        .style("pointer-events", "none")
        .on("mouseover", (event, d) => {
            tooltip
              .style("opacity", 1)
              .html(
                `<strong>${d.country}</strong><br>` +
                  `Score: ${d.medalScore}<br>` +
                  `Medals: ${d.totalMedals}<br>` +
                  `Country rank: ${d.rank}<br>` +
                  `GDP: ${d3.format(",.0f")(d.gdp)} $<br>` +
                  `Population: ${d3.format(",.0f")(d.population)}`
              );
        })
        .on("mousemove", event => {
            const bounds = container.node().getBoundingClientRect();
            tooltip
                .style("left", `${event.clientX - bounds.left + 10}px`)
                .style("top", `${event.clientY - bounds.top - 30}px`);
        })
        .on("mouseout", () => tooltip.style("opacity", 0));

    function updateGraph(mode, year) {
        const xScale = xScales[mode];
        const yScale = yScales[year];
        const tickValues = mode === "gdp" ? tickValuesGdp : tickValuesPopulation;

        const xAxis = d3
            .axisBottom(xScale)
            .tickValues(tickValues)
            .tickFormat(d3.format("~s"));

        const xGrid = d3
            .axisBottom(xScale)
            .tickValues(tickValues)
            .tickSize(-innerHeight)
            .tickFormat("");

        const yGrid = d3
            .axisLeft(yScale)
            .ticks(ticks.y)
            .tickSize(-innerWidth)
            .tickFormat("");

        xAxisGroup.transition().duration(ANIMATION_TIME).call(xAxis);

        xGridGroup
            .call(xGrid)
            .call((g) => g.select(".domain").remove())
            .transition()
            .duration(ANIMATION_TIME)
            .call((g) =>
                g.selectAll("line").style("stroke", "var(--button-active-color)")
            );

        yAxisGroup
            .transition()
            .duration(ANIMATION_TIME)
            .call(d3.axisLeft(yScale).ticks(ticks.y));

        yGridGroup
            .transition()
            .call(yGrid)
            .call((g) => g.select(".domain").remove())
            .duration(ANIMATION_TIME)
            .call((g) =>
                g.selectAll("line").style("stroke", "var(--button-active-color)")
            );

        xAxisLabel.text(
            mode === "gdp" ? "Country GDP ($)" : "Country population"
        );

        allCircles
            .transition()
            .duration(ANIMATION_TIME)
            .attr("cx", (d) => xScale(d[mode]))
            .attr("cy", (d) => yScale(d.medalScore))
            .style("opacity", (d) => (d.year == year ? 1 : 0))
            .style("pointer-events", (d) => (d.year == year ? "auto" : "none"));
        updateTitle(mode);
    }

    // Initial mode/year
    let currentMode = "population";
    updateGraph(currentMode, defaultYear);

    // Toggle buttons
    document.querySelectorAll(".toggle-button").forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".toggle-button").forEach(b => b.classList.remove("active"));
            button.classList.add("active");
            currentMode = button.dataset.mode;
            const selectedYear = parseInt(document.getElementById("yearRange")?.value || defaultYear);
            updateGraph(currentMode, selectedYear);
        });
    });

    const yearSlider = document.getElementById("yearRange");
    const yearLabels = document.querySelectorAll(".year-label");

    if (yearSlider) yearSlider.value = defaultYear;

    function updateActiveYearLabel(year) {
        yearLabels.forEach(label => {
            label.classList.toggle("active", parseInt(label.dataset.year) === year);
        });
    }

    yearSlider?.addEventListener("input", e => {
        const selectedYear = parseInt(e.target.value);
        updateGraph(currentMode, selectedYear);
        updateActiveYearLabel(selectedYear);
    });

    yearLabels.forEach(label => {
        label.addEventListener("click", () => {
            const year = parseInt(label.dataset.year);
            yearSlider.value = year;
            updateGraph(currentMode, year);
            updateActiveYearLabel(year);
        });
    });
    updateActiveYearLabel(parseInt(yearSlider.value));

    createLegend(svg, margin);
}

function createLegend(svg, margin) {
    const legendGroup = svg.append("g")
        .attr("class", "graph-legend");

    const legendData = Object.entries(CONTINENT_LEGEND_COLOR);
    const legendItemWidth = 120;
    const legendSquareSize = 15;
    const legendSpacing = 15;

    const totalLegendWidth = legendData.length * legendItemWidth;

    // Center the legend group horizontally
    const svgWidth = parseFloat(svg.attr("viewBox").split(" ")[2]);
    const legendStartX = (svgWidth - totalLegendWidth) / 2;

    legendGroup.attr("transform", `translate(${legendStartX}, ${margin.top})`);

    // Add legend items
    legendData.forEach(([continent, color], index) => {
        const legendItem = legendGroup.append("g")
            .attr("class", "legend-item")
            .attr("transform", `translate(${index * legendItemWidth}, 0)`);

        // Add the square for the continent color
        legendItem.append("rect")
            .attr("width", legendSquareSize)
            .attr("height", legendSquareSize)
            .attr("fill", color)
            .attr("stroke", "#000")
            .attr("stroke-width", 1);

        // Add the continent label
        legendItem.append("text")
            .attr("x", legendSquareSize + legendSpacing) // Position text to the right of the square
            .attr("y", legendSquareSize - 3) // Vertically align text with the square
            .style("font-family", CSS.Font)
            .style("font-size", "14px")
            .style("fill", CSS.TextColor)
            .text(continent);
    });
}

/**
 * Updates the title of the graph based on the mode.
 *
 * @param {string} mode The mode of the graph, either "gdp" or "population".
 */
function updateTitle(mode) {
    const graphTitle = document.querySelector(".graph-title");
    graphTitle.textContent =
        mode === "gdp"
        ? "Score of Olympic medals in relation to GDP"
        : "Score of Olympic medals in relation to Population";
}