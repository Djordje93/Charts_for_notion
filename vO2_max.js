// Replace with your published Google Sheets URL
const sheetUrl = 'https://docs.google.com/spreadsheets/d/1kOsc8fQ0A07VOp4pykz3B-BzyWuHH1kAQfm9V_tPOcw/pub?output=csv';

function loadChartData(filterOption = '6months') {
    fetch(sheetUrl)
    .then(response => response.text())
    .then(data => {
        const rows = data.split('\n').slice(1); // Skip the header row
        const weeklyData = {};

        // Get the current date and calculate the date for the selected filter
        const currentDate = new Date();
        const filterDate = new Date();

        if (filterOption === '12months') {
            filterDate.setFullYear(currentDate.getFullYear() - 1);
        } else if (filterOption === '6months') {
            filterDate.setMonth(currentDate.getMonth() - 6);
        }

        let mostRecentVo2Max = -Infinity; // Initialize with the smallest possible value

        rows.forEach(row => {
            const columns = row.split(',');
            const date = columns[9]; // Date is in column J
            const vo2_max = parseFloat(columns[7]); // VO2 max is in column H (index 7)

            // Convert date to yyyy-mm-dd format
            const [day, month, year] = date.split('/');
            const jsDate = new Date(`${year}-${month}-${day}`);

            // Filter out data older than the selected filter period
            if (jsDate < filterDate) {
                return; // Skip this row if it's older than the filter period
            }

            const week = getWeekNumber(jsDate);
            const yearWeek = `${jsDate.getFullYear()}-${String(week).padStart(2, '0')}`;

            // Initialize weekly data if not already present
            if (!weeklyData[yearWeek]) {
                weeklyData[yearWeek] = {
                    vo2_max: -Infinity // Initialize with the smallest possible value
                };
            }

            // Track the maximum VO2 max for the week
            if (vo2_max > weeklyData[yearWeek].vo2_max) {
                weeklyData[yearWeek].vo2_max = vo2_max;
            }

            // Update the most recent VO2 max value based on date
            if (jsDate > filterDate && vo2_max > mostRecentVo2Max) {
                mostRecentVo2Max = vo2_max;
            }
        });

        // Sort data by year-week
        const sortedLabels = Object.keys(weeklyData).sort();
        const maxVo2Values = sortedLabels.map(label => weeklyData[label].vo2_max);

        // Get the latest week data
        const latestWeek = sortedLabels[sortedLabels.length - 1];
        const latestWeekVo2Max = mostRecentVo2Max.toFixed(2);

        // Create or update the chart
        const ctx = document.getElementById('myChart').getContext('2d');
        if (window.mixedChart) {
            window.mixedChart.destroy();
        }
        window.mixedChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedLabels,
                datasets: [{
                    label: 'Max VO2 Max',
                    data: maxVo2Values,
                    backgroundColor: 'rgba(252, 132, 151, 0.05)',
                    borderColor: 'rgba(252, 132, 151, 0.4)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointBorderColor: '#FFFFFF',
                    pointBackgroundColor: 'transparent',
                    pointHoverBorderWidth: 10,
                    pointHoverBorderColor: 'rgba(255, 255, 255, 0.2)',
                    fill: true, // No fill under the line
                    tension: 0.3,
                    spanGaps: true,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                elements: {
                    point: {
                        radius: 4,
                        hitRadius: 4,
                        hoverRadius: 4
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)', // Light color for grid lines
                            lineWidth: 1, // Thicker grid lines
                            borderDash: [4, 2], // Dashed grid lines
                        },
                        offset: true,
                        ticks: {
                            color: '#FFFFFF', // Highlight the x-axis labels
                            font: {
                                size: 10
                            },
                            callback: function(value) {
                                return this.getLabelForValue(value).split('-')[1]; // Always show week number only
                            }
                        }
                    },
                    y: {
                        beginAtZero: false,
                        suggestedMax: 53,
                        display: false,
                        title: {
                            display: false,
                            text: 'VO2 Max'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false,
                        labels: {
                            font: {
                                size: 8
                            }
                        },
                        position: 'top'
                    },
                    title: {
                        display: true,
                        color: 'rgba(255,235,255,1)',
                        align: 'center',
                        font: {
                            size: 12
                        },
                        text: `vO2 Max`
                    },
                    subtitle: {
                        display: true,
                        color: 'rgba(255,235,255,1)',
                        align: 'center',
                        font: {
                            size: 16
                        },
                        text: `${latestWeekVo2Max}`
                    },
                    tooltip: {
                        backgroundColor: 'transparent',
                        displayColors: false,
                        titleAlign: 'center',
                        bodyAlign: 'center',
                        bodyFont: {
                            size: 14,
                        },
                        callbacks: {
                            label: function(context) { 
                                return context.raw.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    })
    .catch(error => console.error('Error fetching data:', error));
}

// Helper function to get the ISO week number
function getWeekNumber(d) {
    const date = new Date(d.getTime());
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

// Load the chart with the default filter (last 12 months) when the page loads
window.onload = function() {
    loadChartData();
};