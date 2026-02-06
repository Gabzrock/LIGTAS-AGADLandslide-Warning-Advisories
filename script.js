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
    // Show Loading Overlay
    document.getElementById('loading-overlay').style.display = 'flex';

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
            // Hide Loading Overlay when done
            document.getElementById('loading-overlay').style.display = 'none';
        },
        error: function() {
            handleError("Connection Error");
            // Hide Loading Overlay even on error
            document.getElementById('loading-overlay').style.display = 'none';
        }
    });
}

function updateTable(data) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    data.forEach(row => {
        const tr = document.createElement('tr');
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
    map = L.map('advisory-map').setView([12.8797, 121.7740], 6);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        crossOrigin: 'anonymous'
    }).addTo(map);

    const bounds = [];
    data.forEach(item => {
        if (item.Lat && item.Lng) {
            const coords = [parseFloat(item.Lat), parseFloat(item.Lng)];
            const warningVal = String(item.Warning).trim();

            let circleColor = 'white'; 
            let opacity = 0.3;

            if (warningVal === '1') circleColor = '#facc15'; 
            else if (warningVal === '2') circleColor = '#fd7e14'; 
            else if (warningVal === '3') circleColor = '#dc2626'; 
            else if (warningVal === 'N/A' || warningVal === '') opacity = 0.1; 

            if (opacity > 0) {
                const circle = L.circle(coords, {
                    radius: 20000,
                    color: circleColor,
                    fillColor: circleColor,
                    fillOpacity: opacity,
                    weight: 2,
                    dashArray: '5, 5' // 5-pixel dash, 5-pixel gap

                }).addTo(map);

                circle.bindTooltip(item.AWS_Name, { 
                    permanent: true, direction: 'center', className: 'aws-label' 
                });
            }

            if (item.Icon_URL) {
                const customIcon = L.icon({
                    iconUrl: item.Icon_URL,
                    iconSize: [40, 40],
                    iconAnchor: [20, 40],
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
    if (val === '1') return '#facc15'; 
    if (val === '2') return '#fd7e14'; 
    if (val === '3') return '#dc2626'; 
    if (val === 'N/A') return '#ffffff'; 
    return '#4ade80'; 
}

function handleError(msg) {
    const errDiv = document.getElementById('error-message');
    if(errDiv) { errDiv.innerText = msg; errDiv.style.display = 'block'; }
}

function downloadAdvisory() {
    const node = document.getElementById('advisory-container');
    
    // Temporarily hide the loading overlay before screenshot if it happens to be stuck
    const loadingOverlay = document.getElementById('loading-overlay');
    const originalDisplay = loadingOverlay.style.display;
    loadingOverlay.style.display = 'none';

    domtoimage.toPng(node)
        .then(function (dataUrl) {
            const link = document.createElement('a');
            link.download = 'landslide-advisory.png';
            link.href = dataUrl;
            link.click();
            // Restore display
            loadingOverlay.style.display = originalDisplay;
        })
        .catch(function (error) {
            console.error('Error generating image', error);
            alert("Could not generate image. Check console for details.");
            loadingOverlay.style.display = originalDisplay;
        });
}

window.onload = () => switchRegion('benguet');
