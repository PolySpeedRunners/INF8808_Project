export function drawMedalsVsGdpGraph({ containerSelector, data }) {
    const rankedData = data
        .slice()
        .sort((a, b) => b.total - a.total)
        .map((d, i) => ({ ...d, rank: i + 1 }));

    const margin = { top: 50, right: 20, bottom: 80, left: 80 };
    const ticks = { x: 6, y: 10 };
    const fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-family').trim();
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim();

    const container = d3.select(containerSelector + " .graph");
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const maxMedals = d3.max(rankedData, d => d.total);
    const maxPopulation = d3.max(rankedData, d => d.population);
    const minPopulation = d3.min(rankedData, d => d.population);
    const minPopulationRounded = Math.pow(10, Math.floor(Math.log10(minPopulation)));

    const maxGdp = d3.max(rankedData, d => d.gdp);
    const minGdp = d3.min(rankedData, d => d.gdp);
    const minGdpRounded = Math.pow(10, Math.floor(Math.log10(minGdp)));

    const populationTickValues = d3.range(
        Math.floor(Math.log10(minPopulationRounded)),
        Math.ceil(Math.log10(maxPopulation)) + 1
    ).map(d => Math.pow(10, d));

    const gdpTickValues = d3.range(
        Math.floor(Math.log10(minGdpRounded)),
        Math.ceil(Math.log10(maxGdp)) + 1
    ).map(d => Math.pow(10, d));

    const continentColors = {
        Europe: "#1f77b4",
        Asie: "#ff7f0e",
        Afrique: "#2ca02c",
        Océanie: "#17becf",
        Amérique: "#d62728"
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
        SVK: "Europe"
    };

    function getColorByCountryCode(code) {
        const continent = countryContinentMap[code];
        return continentColors[continent] || "#999";
    }

    container.selectAll("svg").remove();
    container.selectAll("div.tooltip").remove();

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("font-family", fontFamily)
        .style("color", textColor);

    const tooltip = container
        .append("div")
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

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    let currentXKey = "population";
    let currentTickValues = populationTickValues;
    let currentMin = minPopulationRounded;
    let currentMax = maxPopulation;

    let xScale = d3.scaleLog()
        .base(10)
        .domain([currentMin, currentMax * 1.1])
        .range([0, innerWidth * 0.9]);

    let xAxisGenerator = d3.axisBottom(xScale)
        .tickValues(currentTickValues)
        .tickFormat(d3.format("~s"));

    const yScale = d3.scaleLinear()
        .domain([0, Math.ceil(maxMedals / 10) * 10])
        .range([innerHeight, 0]);

    const xAxisGroup = g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(xAxisGenerator)
        .call(g => g.selectAll("text").style("fill", textColor))
        .call(g => g.selectAll("path,line").remove());

    g.append("g")
        .call(d3.axisLeft(yScale).ticks(ticks.y))
        .call(g => g.selectAll("text").style("fill", textColor))
        .call(g => g.selectAll("path,line").remove());

    const xAxisLabel = g.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + margin.bottom - 35)
        .attr("text-anchor", "middle")
        .attr("class", "x-axis-label")
        .style("fill", textColor)
        .text("Population du pays");

    g.append("text")
        .attr("x", -innerHeight / 2)
        .attr("y", -margin.left + 20)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .style("fill", textColor)
        .text("Nombre de médailles");

    const gridColor = textColor;

    g.append("g")
        .attr("class", "grid x-grid")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(
            xAxisGenerator.tickSize(-innerHeight).tickFormat("")
        )
        .call(g => g.selectAll("line").style("stroke", gridColor).style("opacity", 0.2))
        .call(g => g.select(".domain").remove());

    g.append("g")
        .attr("class", "grid y-grid")
        .call(
            d3.axisLeft(yScale)
                .ticks(ticks.y)
                .tickSize(-innerWidth)
                .tickFormat("")
        )
        .call(g => g.selectAll("line").style("stroke", gridColor).style("opacity", 0.2))
        .call(g => g.select(".domain").remove());

    g.selectAll("circle")
        .data(rankedData)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d[currentXKey]))
        .attr("cy", d => yScale(d.total))
        .attr("r", 6)
        .attr("fill", d => getColorByCountryCode(d.countryCode))
        .attr("stroke", textColor)
        .attr("stroke-width", 1)
        .on("mouseover", (event, d) => {
            tooltip
                .style("opacity", 1)
                .html(`<strong>${d.countryLong}</strong><br>Médailles: ${d.total}<br>Rang du pays: ${d.rank}`);
        })
        .on("mousemove", event => {
            const bounds = container.node().getBoundingClientRect();
            tooltip
                .style("left", `${event.clientX - bounds.left + 10}px`)
                .style("top", `${event.clientY - bounds.top - 30}px`);
        })
        .on("mouseout", () => {
            tooltip.style("opacity", 0);
        });

        document.querySelectorAll(".toggle-button").forEach(button => {
            button.addEventListener("click", () => {
                document.querySelectorAll(".toggle-button").forEach(b => b.classList.remove("active"));
                button.classList.add("active");
        
                const mode = button.dataset.mode;
                currentXKey = mode === "gdp" ? "gdp" : "population";
                currentTickValues = mode === "gdp" ? gdpTickValues : populationTickValues;
                currentMin = mode === "gdp" ? minGdpRounded : minPopulationRounded;
                currentMax = mode === "gdp" ? maxGdp : maxPopulation;
        
                xScale.domain([currentMin, currentMax * 1.1]);
        
                xAxisLabel.text(mode === "gdp" ? "PIB du pays" : "Population du pays");
        
                const updatedAxis = d3.axisBottom(xScale)
                    .tickValues(currentTickValues)
                    .tickFormat(d3.format("~s"));
        
                xAxisGroup.transition()
                    .duration(500)
                    .call(updatedAxis)
                    .call(g => g.selectAll("text").style("fill", textColor))
                    .call(g => g.selectAll("path,line").remove());
        
                const updatedGrid = d3.axisBottom(xScale)
                    .tickValues(currentTickValues)
                    .tickFormat("")
                    .tickSize(-innerHeight);
        
                svg.select(".x-grid").transition()
                    .duration(500)
                    .call(updatedGrid)
                    .call(g => g.selectAll("line").style("stroke", gridColor).style("opacity", 0.2))
                    .call(g => g.select(".domain").remove());
        

                g.selectAll("circle")
                    .transition()
                    .duration(500)
                    .attr("cx", d => xScale(d[currentXKey]));
            });
        });
}
