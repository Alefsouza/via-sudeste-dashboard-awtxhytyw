import { useEffect, useRef } from 'react'
import { MappedLocation } from '@/types'

declare const L: any

interface Props {
  locations: MappedLocation[]
  selectedLocation: MappedLocation | null
  onSelect: (loc: MappedLocation) => void
}

export function MapComponent({ locations, selectedLocation, onSelect }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<Record<string, any>>({})

  useEffect(() => {
    if (!mapRef.current) return

    if (!mapInstance.current) {
      if (typeof L === 'undefined') {
        console.error('Leaflet is not loaded')
        return
      }
      mapInstance.current = L.map(mapRef.current, {
        zoomControl: false,
      }).setView([-23.5505, -46.6333], 10)

      L.control.zoom({ position: 'topright' }).addTo(mapInstance.current)

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
      }).addTo(mapInstance.current)
    }

    const currentIds = new Set(locations.map((l) => l.id))

    Object.keys(markersRef.current).forEach((id) => {
      if (!currentIds.has(id)) {
        mapInstance.current.removeLayer(markersRef.current[id])
        delete markersRef.current[id]
      }
    })

    locations.forEach((loc) => {
      if (!loc.latitude || !loc.longitude) return

      let color = '#22c55e' // green
      if (loc.status === 'disconnected')
        color = '#ef4444' // red
      else if (loc.status === 'stopped')
        color = '#eab308' // yellow
      else if (loc.status === 'parked') color = '#9ca3af' // gray

      const isSelected = selectedLocation?.id === loc.id
      const size = isSelected ? 24 : 16
      const border = isSelected ? '3px solid #000' : '2px solid white'
      const zIndexOffset = isSelected ? 1000 : 0

      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color:${color};width:${size}px;height:${size}px;border-radius:50%;border:${border};box-shadow:0 0 6px rgba(0,0,0,0.5); transition: all 0.2s ease;"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })

      if (markersRef.current[loc.id]) {
        markersRef.current[loc.id].setLatLng([loc.latitude, loc.longitude])
        markersRef.current[loc.id].setIcon(customIcon)
        markersRef.current[loc.id].setZIndexOffset(zIndexOffset)
      } else {
        const marker = L.marker([loc.latitude, loc.longitude], {
          icon: customIcon,
          zIndexOffset,
        }).addTo(mapInstance.current)

        marker.on('click', () => onSelect(loc))
        markersRef.current[loc.id] = marker
      }
    })
  }, [locations, selectedLocation, onSelect])

  useEffect(() => {
    if (selectedLocation && mapInstance.current && selectedLocation.latitude) {
      mapInstance.current.flyTo([selectedLocation.latitude, selectedLocation.longitude], 15, {
        duration: 0.5,
      })
    }
  }, [selectedLocation])

  return (
    <div className="w-full h-full relative">
      <div ref={mapRef} className="absolute inset-0 z-0 bg-muted/20" />
    </div>
  )
}
