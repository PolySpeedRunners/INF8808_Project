import { CSS_CONSTANTS as CSS, CONTINENT_LEGEND_COLOR, COUNTRY_TO_CONTINENT_MAP } from '../assets/constants.js';

/**
 * This file contains the code for the medals vs GDP/population graph.
 * It includes the functions to draw the graph and update it based on user input.
 */

/* Local Constants */
const ANIMATION_TIME = 500;

/**
 * Draws a graph comparing the medal score of countries to their GDP or population.
 *
 * @param {string} containerSelector The selector for the container element.
 * @param {object} data The data to be displayed in the graph.
 * @param {number} defaultYear The default year to be displayed in the graph.
 */
export function drawMedalsVsGdpGraph ({ containerSelector, data, defaultYear }) {
  const processedDataByYear = {};

  for (const yearSeasonKey of Object.keys(data)) {
    const [yearStr, season] = yearSeasonKey.split(',');
    const year = parseInt(yearStr);

    const countries = data[yearSeasonKey];
    // This is to avoid the case where a country has no medals but has a GDP or has no GDP but has medals.
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

  const availableYears = Object.keys(data)
    .map(Number)
    .sort((a, b) => a - b);
  const latestYear = availableYears[availableYears.length - 1];
  if (!defaultYear || !data[defaultYear]) defaultYear = latestYear;

  const margin = { top: 20, right: 20, bottom: 80, left: 80 };
  const ticks = { x: 6, y: 10 };
  const container = d3.select(containerSelector + ' .graph');
  const width = container.node().clientWidth;
  const height = container.node().clientHeight;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const getColorByCountryCode = (code) => {
    const continent = COUNTRY_TO_CONTINENT_MAP[code];
    return CONTINENT_LEGEND_COLOR[continent] || '#999';
  };

  container.selectAll('*').remove();

  const svg = container
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('width', '100%')
    .style('height', '100%')
    .style('font-family', CSS.Font)
    .style('color', CSS.TextColor);

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top + 30})`);
  const tooltip = container
    .append('div')
    .attr('class', 'tooltip');

  // The values are used to calculate the min and max values for the x axis.
  const maxPopulation = d3.max(Object.values(data).flat(), (d) => d.population);
  const minPopulation = Math.max(
    1,
    d3.min(Object.values(data).flat(), (d) => d.population)
  );
  const maxGdp = d3.max(Object.values(data).flat(), (d) => d.gdp);
  const minGdp = Math.max(
    1,
    d3.min(Object.values(data).flat(), (d) => d.gdp)
  );
  const minPopulationRounded = Math.pow(10, Math.floor(Math.log10(minPopulation)));
  const minGdpRounded = Math.pow(10, Math.floor(Math.log10(minGdp)));
  const maxPopulationRounded = Math.pow(10, Math.ceil(Math.log10(maxPopulation)));
  const maxGdpRounded = Math.pow(10, Math.ceil(Math.log10(maxGdp)));

  const tickValuesPopulation = d3
    .range(Math.floor(Math.log10(minPopulationRounded)), Math.ceil(Math.log10(maxPopulationRounded)))
    .map((d) => Math.pow(10, d));

  const tickValuesGdp = d3.range(Math.floor(Math.log10(minGdpRounded)), Math.ceil(Math.log10(maxGdpRounded))).map((d) => Math.pow(10, d));

  const xScales = {
    population: d3
      .scaleLog()
      .domain([minPopulationRounded, maxPopulation * 1.1])
      .range([0, innerWidth])
      .base(10),
    gdp: d3
      .scaleLog()
      .domain([minGdpRounded, maxGdp * 1.1])
      .range([0, innerWidth])
      .base(10)
  };

  const yScales = {};
  Object.entries(data).forEach(([year, yearData]) => {
    const maxMedals = d3.max(yearData, (d) => d.medalScore);
    yScales[year] = d3
      .scaleLinear()
      .domain([0, Math.ceil(maxMedals / 10) * 10 + 10])
      .range([innerHeight, 0]);
  });

  const xAxisGroup = g.append('g').attr('transform', `translate(0, ${innerHeight})`);

  const yAxisGroup = g.append('g');

  const xGridGroup = g
    .append('g')
    .attr('class', 'x-grid')
    .attr('transform', `translate(0, ${innerHeight})`)
    .style('color', 'var(--button-active-color)')
    .style('opacity', 0.5);

  const yGridGroup = g.append('g').attr('class', 'y-grid').style('color', 'var(--button-active-color)').style('opacity', 0.5);

  const xAxisLabel = g
    .append('text')
    .attr('x', innerWidth / 2)
    .attr('y', innerHeight + margin.bottom - 35)
    .attr('class', 'x-axis-label');

  g.append('text')
    .attr('x', -innerHeight / 2)
    .attr('y', -margin.left + 20)
    .attr('class', 'y-axis-label')
    .text('Medal Score');

  // Creates the circles for each country for each year. Keeps them transparent until the year is selected.
  const allCircles = g
    .selectAll('circle')
    .data(Object.values(data).flat())
    .enter()
    .append('circle')
    .attr('r', 6)
    .attr('fill', (d) => getColorByCountryCode(d.countryCode))
    .attr('stroke', CSS.TextColor)
    .attr('stroke-width', 1)
    .style('opacity', 0)
    .style('pointer-events', 'none')
    .on('mouseover', (event, d) => {
      tooltip
        .style('opacity', 1)
        .html(
          `<strong>${d.country}</strong><br>` +
            `Score: ${d.medalScore}<br>` +
            `Medals: ${d.totalMedals}<br>` +
            `Country rank: ${d.rank}<br>` +
            `GDP: ${d3.format(',.0f')(d.gdp)} $<br>` +
            `Population: ${d3.format(',.0f')(d.population)}`
        );
    })
    .on('mousemove', (event) => {
      const bounds = container.node().getBoundingClientRect();
      tooltip.style('left', `${event.clientX - bounds.left + 10}px`).style('top', `${event.clientY - bounds.top - 30}px`);
    })
    .on('mouseout', () => tooltip.style('opacity', 0));

  /**
   * Creates the graph and updates it based on the selected mode and year.
   *
   * @param {*} mode The mode of the graph, either "gdp" or "population".
   * @param {*} year The year to display the data for.
   */
  function updateGraph (mode, year) {
    const xScale = xScales[mode];
    const yScale = yScales[year];
    const tickValues = mode === 'gdp' ? tickValuesGdp : tickValuesPopulation;

    const xAxis = d3.axisBottom(xScale).tickValues(tickValues).tickFormat(d3.format('~s'));

    const xGrid = d3.axisBottom(xScale).tickValues(tickValues).tickSize(-innerHeight).tickFormat('');

    const yGrid = d3.axisLeft(yScale).ticks(ticks.y).tickSize(-innerWidth).tickFormat('');

    xAxisGroup.transition().duration(ANIMATION_TIME).call(xAxis);

    xGridGroup
      .call(xGrid)
      .call((g) => g.select('.domain').remove())
      .transition()
      .duration(ANIMATION_TIME)
      .call((g) => g.selectAll('line').style('stroke', 'var(--button-active-color)'));

    yAxisGroup.transition().duration(ANIMATION_TIME).call(d3.axisLeft(yScale).ticks(ticks.y));

    yGridGroup
      .transition()
      .call(yGrid)
      .call((g) => g.select('.domain').remove())
      .duration(ANIMATION_TIME)
      .call((g) => g.selectAll('line').style('stroke', 'var(--button-active-color)'));

    xAxisLabel.text(mode === 'gdp' ? 'Country GDP ($)' : 'Country population');

    allCircles
      .transition()
      .duration(ANIMATION_TIME)
      .attr('cx', (d) => xScale(d[mode]))
      .attr('cy', (d) => yScale(d.medalScore))
      .style('opacity', (d) => (d.year === year ? 1 : 0))
      .style('pointer-events', (d) => (d.year === year ? 'auto' : 'none'));
    updateTitle(mode);
  }

  // Initial mode/year
  let currentMode = 'population';
  updateGraph(currentMode, defaultYear);

  // Toggle buttons for mode selection
  document.querySelectorAll('.toggle-button').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.toggle-button').forEach((b) => b.classList.remove('active'));
      button.classList.add('active');
      currentMode = button.dataset.mode;
      const selectedYear = parseInt(document.getElementById('yearRange')?.value || defaultYear);
      updateGraph(currentMode, selectedYear);
    });
  });
  // Slider for year selection
  const yearSlider = document.getElementById('yearRange');
  const yearLabels = document.querySelectorAll('.year-label');

  if (yearSlider) yearSlider.value = defaultYear;

  /**
   * @param year
   */
  function updateActiveYearLabel (year) {
    yearLabels.forEach((label) => {
      label.classList.toggle('active', parseInt(label.dataset.year) === year);
    });
  }

  yearSlider?.addEventListener('input', (e) => {
    const selectedYear = parseInt(e.target.value);
    updateGraph(currentMode, selectedYear);
    updateActiveYearLabel(selectedYear);
  });

  yearLabels.forEach((label) => {
    label.addEventListener('click', () => {
      const year = parseInt(label.dataset.year);
      yearSlider.value = year;
      updateGraph(currentMode, year);
      updateActiveYearLabel(year);
    });
  });
  updateActiveYearLabel(parseInt(yearSlider.value));

  createLegend(svg, margin);
}

/**
 * Creates a legend for the graph.
 *
 * @param {object} svg The SVG element to append the legend to.
 * @param {object} margin The margin object containing top, right, bottom, and left values.
 */
function createLegend (svg, margin) {
  const legendGroup = svg.append('g').attr('class', 'graph-legend');

  const legendData = Object.entries(CONTINENT_LEGEND_COLOR);
  const legendItemWidth = 120;
  const legendSquareSize = 15;
  const legendSpacing = 15;

  const totalLegendWidth = legendData.length * legendItemWidth;

  // Center the legend group horizontally
  const svgWidth = parseFloat(svg.attr('viewBox').split(' ')[2]);
  const legendStartX = (svgWidth - totalLegendWidth) / 2;

  legendGroup.attr('transform', `translate(${legendStartX}, ${margin.top})`);

  // Add legend items
  legendData.forEach(([continent, color], index) => {
    const legendItem = legendGroup
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', `translate(${index * legendItemWidth}, 0)`);

    // Add the square for the continent color
    legendItem
      .append('rect')
      .attr('width', legendSquareSize)
      .attr('height', legendSquareSize)
      .attr('fill', color)
      .attr('stroke', '#000')
      .attr('stroke-width', 1);

    // Add the continent label
    legendItem
      .append('text')
      .attr('x', legendSquareSize + legendSpacing) // Position text to the right of the square
      .attr('y', legendSquareSize - 3) // Vertically align text with the square
      .style('font-family', CSS.Font)
      .style('font-size', '14px')
      .style('fill', CSS.TextColor)
      .text(continent);
  });
}

/**
 * Updates the title of the graph based on the mode.
 *
 * @param {string} mode The mode of the graph, either "gdp" or "population".
 */
function updateTitle (mode) {
  const graphTitle = document.querySelector('.graph-title');
  graphTitle.textContent = mode === 'gdp' ? 'Score of Olympic medals in relation to GDP' : 'Score of Olympic medals in relation to Population';
}
