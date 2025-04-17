let selectedLayer = null
let populationChart = null

const map = L.map("map").setView([22.9734, 78.6569], 5)

const baseLayers = {
  OpenStreetMap: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }),
  Topo: L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenTopoMap"
  }),
  Satellite: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    attribution: "&copy; Esri, NASA, NGA, USGS"
  }),
  Terrain: L.tileLayer("https://{s}.tile.stamen.com/terrain/{z}/{x}/{y}.jpg", {
    attribution: "&copy; Stamen Maps, OSM"
  })
}

baseLayers.OpenStreetMap.addTo(map)
L.control.layers(baseLayers).addTo(map)

const loadGeoJSON = async (url) => {
  try {
    const res = await fetch(url)
    const data = await res.json()
    renderGeoJSON(data)
  } catch (err) {
    console.error("GeoJSON Load Error:", err)
  }
}

const renderGeoJSON = (data) => {
  const geojsonLayer = L.geoJSON(data, {
    style: {
      color: "#2563eb",
      weight: 1,
      fillOpacity: 0.3
    },
    onEachFeature: (feature, layer) => handleFeatureClick(layer, feature)
  }).addTo(map)

  window.indiaLayer = geojsonLayer

  populateDatalist(data.features)
  renderSummary(data.features)
}

const handleFeatureClick = (layer, feature) => {
  const { Name: stateName = "Unknown", Population: pop = 0 } = feature.properties

  layer.on("click", () => {
    if (selectedLayer) indiaLayer.resetStyle(selectedLayer)

    layer.setStyle({ weight: 3, color: "#dc2626", fillOpacity: 0.5 })
    selectedLayer = layer

    map.fitBounds(layer.getBounds())

    document.getElementById("state-info").innerHTML = `
      <h3>${stateName}</h3>
      <p><strong>Population:</strong> ${(+pop).toLocaleString()}</p>
    `

    renderStateChart(stateName, +pop)
  })
}

const renderStateChart = (stateName, totalPop) => {
  const canvas = document.getElementById("stateChart")

  const rural = Math.floor(totalPop * 0.65)
  const urban = totalPop - rural
  const male = Math.floor(totalPop * 0.51)
  const female = totalPop - male

  const chartData = {
    labels: ["Rural", "Urban", "Male", "Female"],
    datasets: [{
      label: "Population Breakdown",
      data: [rural, urban, male, female],
      backgroundColor: ["#60a5fa", "#1e40af", "#facc15", "#f472b6"],
      borderWidth: 1
    }]
  }

  const config = {
    type: "bar",
    data: chartData,
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `${stateName} Population Breakdown`
        },
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: value => value.toLocaleString() }
        }
      }
    }
  }

  if (populationChart) populationChart.destroy()
  populationChart = new Chart(canvas, config)
}

const populateDatalist = (features) => {
  const datalist = document.getElementById("statesList")
  features.forEach(({ properties: { Name } }) => {
    if (!Name) return
    const option = document.createElement("option")
    option.value = Name
    datalist.appendChild(option)
  })
}

const renderSummary = (features) => {
  const pops = features
    .map(f => parseInt(f.properties.Population))
    .filter(Boolean)

  const totalStates = pops.length
  const totalPopulation = pops.reduce((acc, cur) => acc + cur, 0)
  const avgPopulation = totalStates ? Math.round(totalPopulation / totalStates) : 0

  const sidebar = document.getElementById("sidebar")
  sidebar.insertAdjacentHTML("beforeend", `
    <div style="margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px;">
      <h4>India Summary</h4>
      <p><strong>Total States:</strong> ${totalStates}</p>
      <p><strong>Total Population:</strong> ${totalPopulation.toLocaleString()}</p>
      <p><strong>Average Population:</strong> ${avgPopulation.toLocaleString()}</p>
    </div>
  `)
}


const searchState = () => {
  const query = document.getElementById("search-bar").value.toLowerCase()
  if (!window.indiaLayer) return

  const found = window.indiaLayer.getLayers().some(layer => {
    const name = layer.feature.properties.Name?.toLowerCase()
    if (name === query) {
      layer.fire("click")
      return true
    }
    return false
  })

  if (!found) alert("State not found. Please select from suggestions.")
}

document.getElementById("searchBtn").addEventListener("click", searchState)
document.getElementById("search-bar").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault()
    searchState()
  }
})
loadGeoJSON("indian new.geojson")
