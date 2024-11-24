// Initialize Supabase client
const supabase = createClient(
    'https://qkdfproeljwygmiudzhk.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrZGZwcm9lbGp3eWdtaXVkemhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIyOTU5ODQsImV4cCI6MjA0Nzg3MTk4NH0.7RWUJnDk3myuQ_3uCmMnQsJImGeQrU-qnVBzr4YoMZQ'
);

// Initialize map
const map = L.map('map').setView([35.6532, -83.5070], 11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Store markers
let markers = {};

// Custom icon
const customIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Fetch and update user locations
async function updateLocations() {
    try {
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, email, full_name, location, last_active')
            .not('location', 'is', null)
            .gte('last_active', new Date(Date.now() - 3600000).toISOString());

        if (error) throw error;

        // Update user count
        document.getElementById('userCount').textContent = profiles.length;

        // Remove old markers
        Object.keys(markers).forEach(id => {
            if (!profiles.find(p => p.id === id)) {
                map.removeLayer(markers[id]);
                delete markers[id];
            }
        });

        // Update/add markers
        profiles.forEach(profile => {
            if (profile.location) {
                const position = [profile.location.lat, profile.location.lng];
                
                if (markers[profile.id]) {
                    markers[profile.id].setLatLng(position);
                    markers[profile.id].setPopupContent(createPopupContent(profile));
                } else {
                    const marker = L.marker(position, { icon: customIcon })
                        .bindPopup(createPopupContent(profile))
                        .addTo(map);
                    markers[profile.id] = marker;
                }
            }
        });
    } catch (error) {
        console.error('Error fetching locations:', error);
    }
}

function createPopupContent(profile) {
    return `
        <div class="custom-popup">
            <p class="font-semibold">${profile.full_name || profile.email}</p>
            <p class="text-gray-500 text-sm">
                Last active: ${new Date(profile.last_active).toLocaleString()}
            </p>
        </div>
    `;
}

// Send emergency broadcast
async function sendBroadcast(message) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Send emergency message
        const { error: messageError } = await supabase
            .from('messages')
            .insert([{
                sender_id: user.id,
                content: message,
                type: 'emergency'
            }]);

        if (messageError) throw messageError;

        // Create emergency alert
        const { error: alertError } = await supabase
            .from('emergency_alerts')
            .insert([{
                user_id: user.id,
                type: 'broadcast',
                message: message,
                status: 'active'
            }]);

        if (alertError) throw alertError;

        alert('Emergency broadcast sent successfully');
        document.getElementById('messageInput').value = '';
    } catch (error) {
        console.error('Error sending broadcast:', error);
        alert('Failed to send broadcast: ' + error.message);
    }
}

// Event listeners
document.getElementById('refreshButton').addEventListener('click', updateLocations);
document.getElementById('broadcastButton').addEventListener('click', () => {
    const message = document.getElementById('messageInput').value.trim();
    if (message) {
        sendBroadcast(message);
    } else {
        alert('Please enter a message');
    }
});

// Initial update and start polling
updateLocations();
setInterval(updateLocations, 10000);

// Subscribe to location updates
const channel = supabase
    .channel('location-updates')
    .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles'
    }, () => {
        updateLocations();
    })
    .subscribe();