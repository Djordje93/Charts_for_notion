    // Replace with your published Google Sheets URL
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/1kOsc8fQ0A07VOp4pykz3B-BzyWuHH1kAQfm9V_tPOcw/pub?output=csv';

    function loadChartData(filterOption) {
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
                filterDate.setMonth(currentDate.getMonth() + 1);
            } else if (filterOption === '6months') {
                filterDate.setMonth(currentDate.getMonth() - 5);
            }

            rows.forEach(row => {
                const columns = row.split(',');
                const date = columns[9]; // Date is in column J (index 2)
                const distance = parseFloat(columns[5]); // # Distance is in column F (index 5)
                const running_sum = parseFloat(columns[10]); // Run sum in column K

                // Convert date to yyyy-ww format
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
                        totalDistance: 0,
                        runningSumTotal: 0,
                        count: 0,
                    };
                }

                // Sum distances and running sums for each week
                weeklyData[yearWeek].totalDistance += distance;
                weeklyData[yearWeek].runningSumTotal += running_sum;
                weeklyData[yearWeek].count += 1;
            });

            // Sort data by year-week
            const sortedLabels = Object.keys(weeklyData).sort();
            const sortedValues = sortedLabels.map(label => weeklyData[label].totalDistance);
            const averageRunningSum = sortedLabels.map(label => (weeklyData[label].runningSumTotal / weeklyData[label].count).toFixed(2));

            // Get the latest week data
            const latestWeek = sortedLabels[sortedLabels.length - 1];
            const latestWeekDistance = weeklyData[latestWeek].totalDistance.toFixed(2);
            const latestWeekRunningSum = (weeklyData[latestWeek].runningSumTotal / weeklyData[latestWeek].count).toFixed(2);


            // Create or update the chart
            const ctx = document.getElementById('myChart').getContext('2d');
            if (window.mixedChart) {
                window.mixedChart.destroy();
            }
            window.mixedChart = new Chart(ctx, {
                type: 'bar', // Primary type for the dataset
                data: {
                    labels: sortedLabels,
                    datasets: [{
                        label: '# Distance',
                        data: sortedValues,
                        backgroundColor: 'rgba(76, 76, 76, 0.8)', // Bar color
                        borderColor: 'rgba(76, 76, 76, 1)', // Bar border color
                        borderWidth: 1,
                        borderRadius: 5,
                        hoverBackgroundColor: 'rgba(76, 76, 76, 0.3)'
                    }, {
                        label: 'Average Running Sum (km)',
                        data: averageRunningSum,
                        backgroundColor: 'rgba(252, 132, 151, 0.08)', // Line fill color
                        borderColor: 'rgba(252, 132, 151, 1)', // Line color
                        borderWidth: 3,
                        pointStyle: false,
                        tension: 0.2,
                        type: 'line', // Ensure this dataset is a line chart
                        fill: true // Do not fill under the line
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                autoSkip: true, // Automatically skip labels if too many
                                callback: function(value, index, values) {
                                    if (this.chart.width < 600) { // Set the width threshold for hiding labels
                                        return null; // Hide the label if the chart is too narrow
                                    }
                                    return this.getLabelForValue(value).split('-')[1]; // Show week number only
                                }
                            }
                         },
                        y: {
                            beginAtZero: true, // Y-axis starts at zero
                            min: 0,
                            title: {
                                display: true,
                                text: 'Distance (km)'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            labels: {
                                font: {
                                    size: 8 // Set the font size for legend labels
                                }
                            },
                            position: 'top'
                        },
                        title: {
                            display: true,
                            color: 'rgba(255,235,255,1)',
                            align: 'start',
                            font: {
                                size: 18
                            },
                            text: 'Running volume overview'
                        },
                        subtitle: {
                            display: true,
                            color: 'rgba(255,235,255,0.9)',
                            align: 'start',
                            text: `This week volume ${latestWeekDistance} km | Running Sum ${latestWeekRunningSum} km`
                        },
                        tooltip: {
                            enabled: true
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
        loadChartData('6months');
    };