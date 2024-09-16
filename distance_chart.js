// Replace with your published Google Sheets URL
const sheetUrl = 'https://docs.google.com/spreadsheets/d/1kOsc8fQ0A07VOp4pykz3B-BzyWuHH1kAQfm9V_tPOcw/pub?output=csv';

function loadChartData(filterOption) {
    fetch(sheetUrl)
    .then(response => response.text())
    .then(data => {
      const rows = data.split("\n").slice(1); // Skip the header row
      const weeklyData = {};

      // Get the current date and calculate the date for the selected filter
      const currentDate = new Date();
      const filterDate = new Date();

      if (filterOption === "12months") {
        filterDate.setFullYear(currentDate.getFullYear() - 1);
        filterDate.setMonth(currentDate.getMonth() + 1);
      } else if (filterOption === "6months") {
        filterDate.setMonth(currentDate.getMonth() - 5);
      }

      rows.forEach((row) => {
        const columns = row.split(",");
        const date = columns[9]; // Date is in column J (index 9)
        const distance = parseFloat(columns[5]); // Distance is in column F (index 5)
        const running_sum = parseFloat(columns[10]); // Run sum in column K
        const category = columns[11].trim(); // Category is in column L (index 11)

        // Convert date to yyyy-ww format
        const [day, month, year] = date.split("/");
        const jsDate = new Date(`${year}-${month}-${day}`);

        // Filter out data older than the selected filter period
        if (jsDate < filterDate) {
          return; // Skip this row if it's older than the filter period
        }

        const week = getWeekNumber(jsDate);
        const yearWeek = `${jsDate.getFullYear()}-${String(week).padStart(
          2,
          "0"
        )}`;

        // Initialize weekly data for the week if not already present
        if (!weeklyData[yearWeek]) {
          weeklyData[yearWeek] = {};
        }

        // Initialize category data if not present for the week
        if (!weeklyData[yearWeek][category]) {
          weeklyData[yearWeek][category] = {
            totalDistance: 0,
            runningSumTotal: 0,
            count: 0,
          };
        }

        // Sum distances and running sums for each week and category
        weeklyData[yearWeek][category].totalDistance += distance;
        weeklyData[yearWeek][category].runningSumTotal += running_sum;
        weeklyData[yearWeek][category].count += 1;
      });

      // Sort data by year-week
      const sortedLabels = Object.keys(weeklyData).sort();
      const categories = new Set();

      // Define specific colors for each category
      const categoryColors = {
        Run: "rgba(137, 49, 104, 0.8)", // Green for Run
        Cycling: "rgba(201, 93, 99, 0.8)", // Red for Cycling
        Swim: "rgba(28, 110, 140, 0.8)", // Blue for Swim
        Other: "rgba(208, 204, 208, 0.8)", // Grey for Other
      };

      const categoryColors_hover = {
        Run: "rgba(137, 49, 104, 0.4)", // Green for Run
        Cycling: "rgba(201, 93, 99, 0.4)", // Red for Cycling
        Swim: "rgba(28, 110, 140, 0.4)", // Blue for Swim
        Other: "rgba(208, 204, 208, 0.4)", // Grey for Other
      };

      // Prepare datasets for each category
      const datasets = [];

      sortedLabels.forEach((label) => {
        const weekData = weeklyData[label];
        // Filter to include only 'Run', 'Cycling', and 'Swim'
        const allowedCategories = ['Run', 'Cycling', 'Swim'];

        // Modify dataset creation to only include the allowed categories
        Object.keys(weekData).forEach(category => {
            if (!allowedCategories.includes(category)) {
                return; // Skip categories that are not allowed
            }

            categories.add(category);

          // If the dataset for this category doesn't exist, initialize it
          let dataset = datasets.find((ds) => ds.label === category);
          if (!dataset) {
            dataset = {
                label: category,
                data: Array(sortedLabels.length).fill(0),
                backgroundColor: categoryColors[category] || 'rgba(76, 76, 76, 0.8)', // Default grey
                borderColor: categoryColors[category] || 'rgba(76, 76, 76, 1)',
                borderWidth: 1,
                borderRadius: 5,
                hoverBackgroundColor: categoryColors_hover[category] || 'rgba(76, 76, 76, 0.3)'
            };
            datasets.push(dataset);
          }

          // Find the index of the current week in sorted labels
          const weekIndex = sortedLabels.indexOf(label);

          // Set the total distance for the current category in this week
          dataset.data[weekIndex] = weekData[category].totalDistance;
        });
      });

      // Create or update the chart
      const ctx = document.getElementById("myChart").getContext("2d");
      if (window.mixedChart) {
        window.mixedChart.destroy();
      }
      window.mixedChart = new Chart(ctx, {
        type: "bar", // Primary type for the dataset
        data: {
          labels: sortedLabels,
          datasets: datasets, // Use the prepared datasets for each category
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: {
                display: false,
              },
              ticks: {
                autoSkip: true, // Automatically skip labels if too many
                callback: function (value, index, values) {
                  if (this.chart.width < 600) {
                    // Set the width threshold for hiding labels
                    return null; // Hide the label if the chart is too narrow
                  }
                  return this.getLabelForValue(value).split("-")[1]; // Show week number only
                },
              },
            },
            y: {
              beginAtZero: true, // Y-axis starts at zero
              min: 0,
              title: {
                display: true,
                text: "Distance (km)",
              },
            },
          },
          plugins: {
            legend: {
              display: true,
              labels: {
                font: {
                  size: 8, // Set the font size for legend labels
                },
              },
              position: "top",
            },
            title: {
              display: true,
              color: "rgba(255,235,255,1)",
              align: "start",
              font: {
                size: 18,
              },
              text: "Running volume overview",
            },
            subtitle: {
              display: true,
              color: "rgba(255,235,255,0.9)",
              align: "start",
              text: "Category-wise weekly volume",
            },
            tooltip: {
              enabled: true,
            },
            datalabels: {
              anchor: "end",
              align: "end",
              font: {
                size: 8,
              },
              formatter: (value) => {
                if (value === 0) {
                  //If zero do not show any data label
                  return null;
                }
                return `${Math.round(value)} km`;
              },
            },
          },
        },
        plugins: [ChartDataLabels],
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

// Helper function to get random colors for categories
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Load the chart with the default filter (last 12 months) when the page loads
window.onload = function() {
    loadChartData('6months');
};