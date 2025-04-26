/* Local Constants */
const ANIMATION_TIME = 500; // ms

export const yearSelect = document.getElementById('year-select-podium');

/**
 * Populates the year selector dropdown with available seasons/years from the data
 *
 * @param {object} data - The full dataset with keys in the form of "year,season" (e.g., "2022,Winter").
 */
export function chooseYearRadarChart (data) {
  const years = Object.keys(data).sort();
  years
    .slice()
    .reverse()
    .forEach((year) => {
      const option = document.createElement('option');
      option.value = year;
      const [yearStr, season] = year.split(',');
      const formattedYear = `${
        season.charAt(0).toUpperCase() + season.slice(1)
      } ${yearStr}`;
      option.textContent = formattedYear;
      yearSelect.appendChild(option);
    });

  yearSelect.addEventListener('change', () => {
    const selectedYear = yearSelect.value;
    const yearData = structuredClone(data[selectedYear]);
    applyMinMaxScaling(yearData);
    drawRadarCharts(yearData, selectedYear);
  });

  // The initial year should be the last year in the list.
  const initialYear = years[years.length - 1];
  yearSelect.value = initialYear;
  const initialYearData = structuredClone(data[initialYear]);
  applyMinMaxScaling(initialYearData);
  drawRadarCharts(initialYearData, initialYear);
}

/**
 * Draws radar charts for the top 5 countries based on `medalScore` for the selected year.
 *
 * @param {object} yearData - Country data for a specific year/season.
 * @param {string} selectedYear - The selected year string (e.g., "2022,Winter").
 */
function drawRadarCharts (yearData, selectedYear) {
  const sortedCountries = Object.entries(yearData)
    .sort(([, a], [, b]) => b.medalScore - a.medalScore)
    .slice(0, 5);

  sortedCountries.forEach(([_, countryData], index) => {
    drawRadarChart({
      containerSelector: `#chart-container-${index + 1}`,
      data: countryData,
      rank: index + 1
    });
  });
}

/**
 * Calculates min-max scaling for selected features across all countries and appends
 * scaled values to each country's data under `minmax_` prefixed keys.
 * The values goes from 1 to 10.
 *
 * @param {object} resultsData - Country data to scale.
 */
function applyMinMaxScaling (resultsData) {
  const keysToScale = [
    'gdpPerCapita',
    'percentage',
    'population',
    'tfr',
    'AthCount'
  ];
  const minMax = {};

  const countries = Object.values(resultsData);
  countries.forEach((c) => {
    if (
      typeof c.gdp === 'number' &&
      typeof c.population === 'number' &&
      c.population !== 0
    ) {
      c.gdpPerCapita = c.gdp / c.population;
    } else {
      c.gdpPerCapita = 0;
    }
  });

  for (const key of keysToScale) {
    const values = countries
      .map((c) => c[key])
      .filter((v) => typeof v === 'number' && !isNaN(v));
    minMax[key] = {
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  for (const noc in resultsData) {
    const countryData = resultsData[noc];
    for (const key of keysToScale) {
      const value = countryData[key];
      const { min, max } = minMax[key];
      let scaled = null;
      if (typeof value === 'number' && !isNaN(value) && max !== min) {
        scaled = 1 + (value - min) * (9 / (max - min));
      } else {
        scaled = 1;
      }
      countryData[`minmax_${key}`] = scaled;
    }
  }
}

/**
 * Converts internal radar key names into human-readable labels for display on the chart.
 *
 * @param {string} key - A string key like `minmax_population`.
 * @returns {string} A formatted label like "Population".
 */
function formatRadarKey (key) {
  switch (key) {
    case 'minmax_gdpPerCapita':
      return 'GDP per Capita';
    case 'minmax_population':
      return 'Population';
    case 'minmax_tfr':
      return 'Fertility Rate';
    case 'minmax_percentage':
      return 'Youth % (15-25)';
    case 'minmax_AthCount':
      return 'Athlete Count';
    default:
      return key;
  }
}

/**
 * Renders a radar chart into the specified container using scaled data for one country.
 *
 * @param {object} params - Chart configuration.
 * @param {string} params.containerSelector - CSS selector for the chart's container div.
 * @param {object} params.data - The country data including scaled values.
 * @param {number} params.rank - The rank of the country
 */
export function drawRadarChart ({ containerSelector, data, rank }) {
  const margin = { top: 50, right: 0, bottom: 0, left: 0 };
  const container = setupContainer(containerSelector);
  const { width, height, innerWidth, innerHeight } = getDimensions(
    container,
    margin
  );
  const radius = (Math.min(innerWidth, innerHeight) / 2) * 0.7;

  const radarKeys = [
    'minmax_gdpPerCapita',
    'minmax_population',
    'minmax_tfr',
    'minmax_percentage',
    'minmax_AthCount'
  ];
  const svg = createSVG(container, width, height, data, rank);
  const chartGroup = svg
    .append('g')
    .attr(
      'transform',
      `translate(${margin.left + innerWidth / 2}, ${
        margin.top + innerHeight / 2
      })`
    );

  const scale = d3
    .scaleLinear()
    .domain([1, 10])
    .range([radius * 0.1, radius]);
  const radarAxis = d3
    .scaleBand()
    .domain(radarKeys)
    .range([0, Math.PI * 2]);

  drawRadarGrid(chartGroup, radius);
  drawRadarAxes(chartGroup, radarKeys, radarAxis, scale);
  drawRadarLabels(chartGroup, radarKeys, radarAxis, scale);

  const countryValues = radarKeys.map((key) => ({
    axis: key,
    value: scale(data[key])
  }));

  // Add the first value to the end of the array to close the radar shape
  countryValues.push(countryValues[0]);

  const sectionContainer = d3.select(container.node().closest('#section2'));
  sectionContainer.style('position', 'relative');
  drawRadarShape(chartGroup, countryValues, radarAxis);

  drawTitle(svg, width, margin.top, data.countryName);
}

/**
 * Selects and clears the radar chart container and removes any existing tooltips.
 *
 * @param {string} selector - The CSS selector for the chart container.
 * @returns {d3.Selection} The cleaned D3 selection of the container.
 */
function setupContainer (selector) {
  const container = d3.select(selector);
  container.selectAll('*').remove();
  container.selectAll('div.tooltip').remove();
  return container;
}

/**
 * Calculates SVG dimensions from a container and provided margins.
 *
 * @param {d3.Selection} container - The D3 container selection.
 * @param {object} margin - An object with top, right, bottom, and left margins.
 * @returns {object} Object containing full and inner dimensions.
 */
function getDimensions (container, margin) {
  const width = container.node().clientWidth;
  const height = container.node().clientHeight;
  return {
    width,
    height,
    innerWidth: width - margin.left - margin.right,
    innerHeight: height - margin.top - margin.bottom
  };
}

/**
 * Appends an SVG element to the container with hover behavior.
 *
 * @param {d3.Selection} container - The chart container.
 * @param {number} width - SVG width.
 * @param {number} height - SVG height.
 * @param {object} data - The country data used for the tooltip.
 * @param {number} rank - The rank of the country
 * @returns {d3.Selection} The created SVG element.
 */
function createSVG (container, width, height, data, rank) {
  const svg = container
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('width', '100%')
    .style('height', '100%');

  const currentPodium = container.node().parentNode?.parentNode;
  const sectionContainer = d3.select(container.node().closest('#section2'));
  const tooltip = createTooltip(sectionContainer);
  const allPodiums = d3.select(currentPodium.parentNode).selectAll('.podium');

  svg
    .on('mouseover', () => {
      svg
        .transition()
        .duration(100)
        .attr('transform', `scale(1.4) translate(${0}, ${-height / 5})`);
      tooltip.style('opacity', 1).html(
        `<strong>${data.countryName}</strong><br>` +
        `<table>
          <tr><td>Rank</td><td>${rank}</td></tr>
          <tr><td>GDP per Capita</td><td>${d3.format(',.0f')(data.gdpPerCapita)} $</td></tr>
          <tr><td>Population</td><td>${d3.format(',.0f')(data.population)}</td></tr>
          <tr><td>Fertility</td><td>${data.tfr.toFixed(2)}</td></tr>
          <tr><td>Youth %</td><td>${data.percentage.toFixed(2)}%</td></tr>
          <tr><td>Athletes</td><td>${d3.format(',')(data.AthCount)}</td></tr>
          <tr><td>Medal Score</td><td>${d3.format(',')(data.medalScore)}</td></tr>
          <tr><td>Medals Obtained</td><td>${data.totalMedals}</td></tr>
          <tr><td>🥇 Gold</td><td>${data.totalGold}</td></tr>
          <tr><td>🥈 Silver</td><td>${data.totalSilver}</td></tr>
          <tr><td>🥉 Bronze</td><td>${data.totalBronze}</td></tr>
        </table>`,
      );

      // Making the hovered podium larger.
      d3.select(currentPodium).transition().duration(200).style('width', '80%');
      // Making all other podiums smaller.
      allPodiums
        .filter((_, i, nodes) => nodes[i] !== currentPodium)
        .transition()
        .duration(100)
        .style('width', '18%');
    })
    .on('mouseout', () => {
      svg.transition().duration(200).attr('transform', 'scale(1)');
      tooltip.style('opacity', 0);
      // Reset the current podium.
      d3.select(currentPodium).transition().duration(200).style('width', '20%');
      // Reset all other podiums.
      allPodiums.transition().duration(200).style('width', '20%');
    });

  return svg;
}

/**
 * Draws concentric polygon grid levels on the radar chart.
 *
 * @param {d3.Selection} group - The chart group (g element).
 * @param {number} radius - The outer radius of the radar chart.
 */
function drawRadarGrid (group, radius) {
  const gridLevels = 10;
  const radarKeys = 5;
  const angleStep = (2 * Math.PI) / radarKeys;

  for (let level = 1; level <= gridLevels; level++) {
    const levelRadius = (radius * level) / gridLevels;
    const points = Array.from({ length: radarKeys }, (_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      return [levelRadius * Math.cos(angle), levelRadius * Math.sin(angle)];
    });

    group
      .append('polygon')
      .attr('points', points.map(([x, y]) => `${x},${y}`).join(' '))
      .style('fill', 'none')
      .style('stroke', '#F76B51')
      .style('stroke-width', '0.5px');
  }
}

/**
 * Draws axis lines for each feature around the radar chart.
 *
 * @param {d3.Selection} group - The chart group.
 * @param {Array<string>} keys - List of radar metric keys.
 * @param {Function} axisScale - Angular scale for axes.
 * @param {Function} valueScale - Radial scale.
 */
function drawRadarAxes (group, keys, axisScale, valueScale) {
  keys.forEach((key) => {
    const angle = axisScale(key) - Math.PI / 2;
    group
      .append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', valueScale(10) * Math.cos(angle))
      .attr('y2', valueScale(10) * Math.sin(angle))
      .attr('stroke', 'var(--text-color)')
      .attr('stroke-width', 2);
  });
}

/**
 * Draws labels at the end of each axis in the radar chart.
 *
 * @param {d3.Selection} group - The chart group.
 * @param {Array<string>} keys - List of radar metric keys.
 * @param {Function} axisScale - Angular scale.
 * @param {Function} valueScale - Radial scale.
 */
function drawRadarLabels (group, keys, axisScale, valueScale) {
  keys.forEach((key) => {
    const angle = axisScale(key) - Math.PI / 2;
    let xPos = valueScale(10) * Math.cos(angle);
    let yPos = valueScale(10) * Math.sin(angle);
    // Adjust positions for specific keys
    if (key === 'minmax_percentage' || key === 'minmax_tfr') {
      xPos *= 1.6;
      yPos *= 1.6;
    }
    if (key === 'minmax_AthCount') {
      xPos -= 15;
    }
    if (key === 'minmax_population') {
      xPos += 15;
    }
    group
      .append('text')
      .attr('x', xPos)
      .attr('y', yPos)
      .attr('dy', '-10px')
      .style('text-anchor', 'middle')
      .style('font-family', 'var(--font-family)')
      .style('fill', 'var(--text-color)')
      .style('font-size', '12px')
      .text(formatRadarKey(key));
  });
}

/**
 * Draws the radar area (polygon) connecting scaled values.
 *
 * @param {d3.Selection} group - The chart group.
 * @param {Array<object>} values - Scaled values, each with `axis` and `value`.
 * @param {Function} axisScale - Angular scale.
 */
function drawRadarShape (group, values, axisScale) {
  const radarLine = d3
    .lineRadial()
    .angle((d) => axisScale(d.axis))
    .radius((d) => d.value);

  // Create a fill color with opacity

  // Append the path
  const path = group
    .append('path')
    .datum(values)
    .attr('d', radarLine)
    .attr('fill', 'var(--button-active-color)')
    .attr('fill-opacity', 0.2)
    .attr('stroke', 'var(--button-active-color)')
    .attr('stroke-width', 2)
    .style('pointer-events', 'all')
    .attr('stroke-dasharray', function () {
      return this.getTotalLength(); // Set the dash array to the total path length.
    })
    .attr('stroke-dashoffset', function () {
      return this.getTotalLength(); // Initially offset the dash array by the total length.
    });

  // Add the animation
  path
    .transition()
    .duration(ANIMATION_TIME)
    .ease(d3.easeLinear)
    .attr('stroke-dashoffset', 0);
}

/**
 * Creates a tooltip div element which appears when hovering on a radar chart.
 *
 * @param {*} container The d3 selection of the graph's container.
 * @returns {object} The tooltip div element.
 */
function createTooltip (container) {
  return container
    .append('div')
    .attr('class', 'tooltip')
    .style('top', '100px')
    .style('right', '70px');
}

/**
 * Draws the chart title (country name) at the top of the radar chart.
 *
 * @param {d3.Selection} svg - The main SVG element.
 * @param {number} width - Width of the SVG.
 * @param {number} topMargin - Top margin for placing the title.
 * @param {string} countryName - Name of the country.
 */
function drawTitle (svg, width, topMargin, countryName) {
  svg
    .append('text')
    .attr('x', width / 2)
    .attr('y', topMargin / 1.2)
    .attr('text-anchor', 'middle')
    .style('font-family', 'var(--font-family)')
    .style('font-size', '25px')
    .style('fill', 'var(--text-color)')
    .text(`${countryName}`);
}
