const CONFIG = {
    'benguet': {
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSosfBP3StMyRUzwI0tUZPsLjPVH1zePCz8gZbTMOzjOvnonbmNCoy5VT46UxO0qdqb-Wm9EqTpXp8y/pub?gid=989357250&single=true&output=csv',
        title: 'Northern Luzon <span class="highlight">Landslide Warning Advisory</span>',
        threshold: '64 mm',
        footer: 'Computed threshold in Benguet Province'
    },
    'calabarzon': {
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSosfBP3StMyRUzwI0tUZPsLjPVH1zePCz8gZbTMOzjOvnonbmNCoy5VT46UxO0qdqb-Wm9EqTpXp8y/pub?gid=1182911633&single=true&output=csv',
        title: 'CALABARZON <span class="highlight">Landslide Warning Advisory</span>',
        threshold: '92 mm*',
        footer: '*Rainfall-Landslide Threshold for CALABARZON applied in Laguna'
    },
    'northern-samar': {
        url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSosfBP3StMyRUzwI0tUZPsLjPVH1zePCz8gZbTMOzjOvnonbmNCoy5VT46UxO0qdqb-Wm9EqTpXp8y/pub?gid=2049973263&single=true&output=csv',
        title: 'Northern Samar <span class="highlight">Landslide Warning Advisory</span>',
        threshold: '27 mm**',
        footer: '**Rainfall Landslide Threshold for Bicol Region applied in Northern Samar'
    }
};

let map;

function switchRegion(regionId) {
    const config = CONFIG[regionId];
    
    // Update Text Elements
    document.getElementById('region-title').innerHTML = config.title;
    document.getElementById('threshold-value').innerText = config.threshold;
    document.getElementById('table-footer-label').innerText = config.footer;
    document.getElementById('error-message').style.display = 'none';
    
    // Update Navigation Tabs
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-${regionId}`).classList.add('active');

    fetchData(config.url);
}

function fetchData(url) {
    Papa.parse(url, {
        download: true,
        header: true,
        complete: function(results) {
            const data = results.data.filter(row => row.AWS_Name);
            if (data.length > 0) {
                document.getElementById('rainfall-date').innerHTML = data[0].Date || 'Date Unavailable';
                updateTable(data);
                updateMap(data);
            } else {
                handleError("No data found.");
            }
        },
        error: function() {
            handleError("Connection Error");
        }
    });
}

function updateTable(data) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    data.forEach(row => {
        const tr = document.createElement('tr');
        // Get color for the table text as well
        const color = getWarningColor(row.Warning);
        
        tr.innerHTML = `
            <td>${row.AWS_Name}</td>
            <td>${row.Municipality}</td>
            <td>${row.Cumulative}</td>
            <td style="color:${color}; font-weight:bold;">${row.Warning}</td>
        `;
        tbody.appendChild(tr);
    });
}

function updateMap(data) {
    if (map) map.remove();
    
    // Initialize Map
    map = L.map('advisory-map').setView([12.8797, 121.7740], 6);

    // Satellite Layer
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        crossOrigin: 'anonymous'
    }).addTo(map);

    const bounds = [];
    
    data.forEach(item => {
        if (item.Lat && item.Lng) {
            const coords = [parseFloat(item.Lat), parseFloat(item.Lng)];
            const warningVal = String(item.Warning).trim();

            // --- 1. Determine Warning Color ---
            let circleColor = '#4ade80'; // Default Green (0)
            let opacity = 0.3;

            if (warningVal === '1') {
                circleColor = '#facc15'; // Yellow
            } else if (warningVal === '2') {
                circleColor = '#fd7e14'; // Orange
            } else if (warningVal === '3') {
                circleColor = '#dc2626'; // Red
            } else if (warningVal === 'N/A' || warningVal === '') {
                opacity = 0; // Hide circle if N/A
            }

            // --- 2. Draw Buffer Circle (If not N/A) ---
            if (opacity > 0) {
                const circle = L.circle(coords, {
                    radius: 20000,
                    color: circleColor,
                    fillColor: circleColor,
                    fillOpacity: opacity,
                    weight: 2
                }).addTo(map);

                // Add Label
                circle.bindTooltip(item.AWS_Name, { 
                    permanent: true, 
                    direction: 'center', 
                    className: 'aws-label' 
                });
            }

            // --- 3. Restore Marker Logos (Icons) ---
            if (item.Icon_URL) {
                const customIcon = L.icon({
                    iconUrl: item.Icon_URL,
                    iconSize: [40, 40],     // Adjusted size for visibility
                    iconAnchor: [20, 40],   // Center bottom anchor
                    popupAnchor: [0, -40],
                    className: 'station-icon' 
                });
                
                L.marker(coords, { icon: customIcon }).addTo(map);
            }

            bounds.push(coords);
        }
    });
    
    if (bounds.length > 0) map.fitBounds(L.latLngBounds(bounds).pad(0.2));
}

function getWarningColor(val) {
    val = String(val).trim();
    if (val === '1') return '#facc15'; // Yellow
    if (val === '2') return '#fd7e14'; // Orange
    if (val === '3') return '#dc2626'; // Red
    if (val === 'N/A') return '#ffffff'; // White text for N/A
    return '#4ade80'; // Green (0)
}

function handleError(msg) {
    const errDiv = document.getElementById('error-message');
    if(errDiv) {
        errDiv.innerText = msg;
        errDiv.style.display = 'block';
    }
}

// Function to Download the Advisory as an Image
function downloadAdvisory() {
    const node = document.getElementById('advisory-container');
    
    domtoimage.toPng(node)
        .then(function (dataUrl) {
            const link = document.createElement('a');
            link.download = 'landslide-advisory.png';
            link.href = dataUrl;
            link.click();
        })
        .catch(function (error) {
            console.error('Error generating image', error);
            alert("Could not generate image. Check console for details.");
        });
}

// Initial Load
window.onload = () => switchRegion('benguet');