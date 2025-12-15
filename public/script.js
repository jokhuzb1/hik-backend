const socket = io();

// chart setup
const ctx = document.getElementById('activityChart').getContext('2d');
const activityChart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: ['Today', 'Yesterday', '2 Days Ago'], // Simplified placeholder for now
        datasets: [{
            label: 'Detections',
            data: [0, 0, 0],
            backgroundColor: '#3b82f6',
            borderRadius: 6
        }]
    },
    options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
            y: { beginAtZero: true, grid: { color: '#334155' } },
            x: { grid: { display: false } }
        }
    }
});

function updateStats() {
    fetch('/api/stats')
        .then(res => res.json())
        .then(data => {
            document.getElementById('count-today').innerText = data.today;
            document.getElementById('count-week').innerText = data.week;
            document.getElementById('count-total').innerText = data.total;

            // Update chart (basic simulation for "today")
            // specific historical data API would be better for the chart
            activityChart.data.datasets[0].data[0] = data.today;
            activityChart.update();
        });
}

function updateRecent() {
    fetch('/api/recent')
        .then(res => res.json())
        .then(rows => {
            const tbody = document.getElementById('history-table');
            tbody.innerHTML = '';
            rows.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(row.timestamp).toLocaleTimeString()}</td>
                    <td>${row.type}</td>
                    <td><span class="${row.plate_number ? 'plate-number' : ''}">${row.plate_number || 'Unknown'}</span></td>
                    <td><a href="${row.image_url}" target="_blank"><img src="${row.image_url}" class="thumb"></a></td>
                `;
                tbody.appendChild(tr);
            });
        });
}

// Initial Load
updateStats();
updateRecent();

// Real-time events
socket.on('new_event', (data) => {
    // Update live feed
    const img = document.getElementById('live-image');
    img.src = data.image_path;

    document.getElementById('latest-type').innerText = data.type.toUpperCase();
    document.getElementById('latest-time').innerText = new Date(data.timestamp).toLocaleTimeString();

    const plateEl = document.getElementById('latest-plate');
    plateEl.innerText = data.plate || '---';
    if (data.plate) plateEl.classList.add('plate-number');
    else plateEl.classList.remove('plate-number');

    // Refresh stats
    updateStats();
    updateRecent();
});
