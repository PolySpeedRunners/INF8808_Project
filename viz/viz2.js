export function drawRadarChart({ containerSelector, data }) {
    console.log(data);
    const margin = { top: 50, right: 20, bottom: 80, left: 80 };
    const ticks = { x: 6, y: 10 };
    const fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-family').trim();
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim();

    const container = d3.select(containerSelector + " .graph");
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
}
