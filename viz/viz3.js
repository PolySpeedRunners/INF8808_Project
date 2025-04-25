import {
  CSS_CONSTANTS as CSS,
  MEDAL_COLORS,
  MEDAL_VALUES
} from '../assets/constants.js';

export const yearSelect = document.getElementById('year-select');
export const disciplineSelect = document.getElementById('discipline-select');

/* Local Constants */
const ANIMATION_TIME = 500; // ms
const section3Container = '#section3';

/**
 * Populates the dropdowns with year/season and disciplines
 *
 * @param {object} data - The full dataset with keys in the form of "year,season" (e.g., "2022,winter").
 */
export function populateYearAndDisciplineOptions (data) {
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
    updateDisciplinesList(selectedYear, data);
    updateChart(data); // to redraw the chart on year change
  });

  // Initial population for the first year
  const firstYear = years[years.length - 1];
  updateDisciplinesList(firstYear, data);
}

/**
 * Updates the discipline dropdown based on the selected year with event listener
 *
 * @param {string} year - The selected year-season string (e.g., "2022,Winter").
 * @param {object} data - The full dataset.
 */
function updateDisciplinesList (year, data) {
  disciplineSelect.innerHTML = '';

  const yearData = data[year] || {};
  const disciplines = new Set();

  for (const country of Object.values(yearData)) {
    for (const discipline of Object.keys(country.disciplines || {})) {
      disciplines.add(discipline);
    }
  }

  const sortedDisciplines = Array.from(disciplines).sort();

  sortedDisciplines.forEach((discipline) => {
    const option = document.createElement('option');
    option.value = discipline;
    option.textContent = discipline;
    disciplineSelect.appendChild(option);
  });

  if (sortedDisciplines.length > 0) {
    disciplineSelect.value = sortedDisciplines[0];
  }
  disciplineSelect.addEventListener('change', () => updateChart(data));
}

/**
 * Updates the chart based on the selected year and discipline.
 *
 * @param {*} resultsData The data to be used for the chart.
 */
function updateChart (resultsData) {
  const year = yearSelect.value;
  const discipline = disciplineSelect.value;

  drawBarChart({
    containerSelector: section3Container,
    data: resultsData,
    yearSeason: year,
    discipline: discipline
  });
}

/**
 * Draws a stacked bar chart of medal scores by country for a given year and discipline.
 *
 * @param {object} params - Params of the function
 * @param {string} params.containerSelector - CSS selector for the chart container.
 * @param {object} params.data - Full dataset.
 * @param {string} params.yearSeason - The selected year-season key (e.g., "2022,Winter").
 * @param {string} params.discipline - The selected discipline name.
 */
export function drawBarChart ({
  containerSelector,
  data,
  yearSeason,
  discipline
}) {
  const margin = { top: 50, right: 20, bottom: 90, left: 80 };
  const ticks = { x: 6, y: 10 };

  const container = d3.select(containerSelector + ' .graph');
  container.selectAll('*').remove();
  container.selectAll('div.tooltip').remove();
  const tooltip = createToolTip(container);

  const width = container.node().clientWidth;
  const height = container.node().clientHeight;

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = container
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet') // Maintain aspect ratio.
    .style('width', '100%')
    .style('height', '100%')
    .style('font-family', CSS.Font)
    .style('color', CSS.TextColor);

  const chart = svg
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const yearData = data[yearSeason] || {};
  const formattedData = Object.entries(yearData)
    .map(([noc, values]) => {
      const gold = values.disciplines?.[discipline]?.gold || 0;
      const silver = values.disciplines?.[discipline]?.silver || 0;
      const bronze = values.disciplines?.[discipline]?.bronze || 0;

      return {
        countryName: values.countryName,
        score: values.disciplines?.[discipline]?.score || 0,
        medals: values.disciplines?.[discipline]?.total || 0,
        gold,
        silver,
        bronze,
        goldScore: gold * MEDAL_VALUES.Gold,
        silverScore: silver * MEDAL_VALUES.Silver,
        bronzeScore: bronze * MEDAL_VALUES.Bronze
      };
    })
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20); // Top 20
  const topCountryName = formattedData[0]?.countryName;
  const x = d3
    .scaleBand()
    .domain(formattedData.map((d) => d.countryName))
    .range([0, innerWidth])
    .padding(0.1);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(formattedData, (d) => d.score)])
    .nice()
    .range([innerHeight, 0]);

  const stack = d3.stack().keys(['bronzeScore', 'silverScore', 'goldScore']);
  const stackedData = stack(formattedData); // Stacks the data for the three types of medal.
  chart
    .selectAll('g.stack')
    .data(stackedData)
    .join('g')
    .attr('class', 'stack')
    .attr('fill', (d) => MEDAL_COLORS[d.key])
    .selectAll('rect')
    .data((d) => d)
    .join('rect')
    .attr('x', (d) => x(d.data.countryName))
    .attr('width', x.bandwidth())
    .attr('y', innerHeight)
    .attr('height', 0)
    // Add tool tips events.
    .on('mouseover', (event, d) => {
      tooltip
        .style('opacity', 1)
        .html(
          `<strong>${d.data.countryName}</strong><br>` +
            `Total Medals: ${d.data.medals}<br>` +
            `Score: ${d.data.score}<br>` +
            `🥇 Gold: ${d.data.gold}<br>` +
            `🥈 Silver: ${d.data.silver}<br>` +
            `🥉 Bronze: ${d.data.bronze}`
        );
    })
    .on('mousemove', (event) => {
      const bounds = container.node().getBoundingClientRect();
      tooltip
        .style('left', `${event.clientX - bounds.left + 25}px`)
        .style('top', `${event.clientY - bounds.top}px`);
    })
    .on('mouseout', () => {
      tooltip.style('opacity', 0);
    })
    // Adds a transition to the bars when they are drawn.
    .transition()
    .duration(ANIMATION_TIME)
    .attr('y', (d) => y(d[1])) // Use the upper value of the stack.
    .attr('height', (d) => y(d[0]) - y(d[1])); // Height is the difference between stack values.

  chart
    .append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).tickSizeOuter(0))
    .selectAll('text')
    .style('text-anchor', 'end')
    .attr('transform', 'rotate(-35)')
    .style('font-family', CSS.Font)
    .style('fill', CSS.TextColor)
    .style('font-weight', (d) => (d === topCountryName ? 'bold' : 'normal'));

  chart
    .append('g')
    .call(
      // Displays only integer values on the y-axis.
      d3
        .axisLeft(y)
        .tickValues(y.ticks(ticks.y).filter((t) => Number.isInteger(t)))
        .tickFormat(d3.format('d'))
    )
    .selectAll('text')
    .style('font-family', CSS.Font)
    .style('fill', CSS.TextColor);

  chart
    .append('text')
    .attr('x', -innerHeight / 2)
    .attr('y', -margin.left + 20)
    .attr('class', 'y-axis-label')
    .text('Medal Score');

  chart
    .append('text')
    .attr('x', innerWidth / 2)
    .attr('y', innerHeight + margin.top + 35)
    .attr('class', 'x-axis-label')
    .text('Countries');

  // Makes a const for the formatted season, it should be Season XXXX.
  const [year, season] = yearSeason.split(',');
  const yearSeasonFormatted =
    season.charAt(0).toUpperCase() + season.slice(1) + ' ' + year;
  svg
    .append('text')
    .attr('x', width / 2)
    .attr('y', margin.top / 2)
    .attr('text-anchor', 'middle')
    .style('font-family', CSS.Font)
    .style('font-size', '22px')
    .style('font-weight', 'bold')
    .style('fill', CSS.TextColor)
    .text(`${discipline} Medals in ${yearSeasonFormatted} Olympics`);
}

/**
 * Creates a tooltip div element which appears when hovering on a bar chart.
 *
 * @param {*} container The d3 selection of the graph's container.
 * @returns {*} The tooltip div element.
 */
function createToolTip (container) {
  return container
    .append('div')
    .attr('class', 'tooltip');
}
