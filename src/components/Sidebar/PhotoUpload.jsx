import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, X, Upload, Image, AlertCircle } from 'lucide-react'
import styles from './PhotoUpload.module.css'

export const PhotoUpload = ({ photos = [], onPhotosChange, maxPhotos = 5 }) => {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files)
    handleFiles(files)
  }

  const handleFiles = async (files) => {
    if (files.length === 0) return
    
    // Filter for image files only
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length === 0) {
      alert('Please select only image files')
      return
    }

    // Check if adding these files would exceed the limit
    if (photos.length + imageFiles.length > maxPhotos) {
      alert(`Maximum ${maxPhotos} photos allowed`)
      return
    }

    setUploading(true)
    
    try {
      const newPhotos = await Promise.all(
        imageFiles.map(async (file) => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              resolve({
                id: Date.now() + Math.random(),
                file,
                url: e.target.result,
                name: file.name,
                size: file.size,
                type: file.type,
                uploadedAt: new Date().toISOString()
              })
            }
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
        })
      )

      onPhotosChange([...photos, ...newPhotos])
    } catch (error) {
      console.error('Error uploading photos:', error)
      alert('Error uploading photos. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = (photoId) => {
    onPhotosChange(photos.filter(photo => photo.id !== photoId))
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={styles.photoUpload}>
      <div className={styles.header}>
        <Camera size={16} />
        <span>Photos ({photos.length}/{maxPhotos})</span>
      </div>

      {photos.length < maxPhotos && (
        <div
          className={`${styles.dropzone} ${dragActive ? styles.active : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
          
          <div className={styles.dropzoneContent}>
            {uploading ? (
              <div className={styles.uploadingState}>
                <div className={styles.spinner} />
                <p>Uploading...</p>
              </div>
            ) : (
              <>
                <Upload size={24} />
                <p>Drop photos here or click to select</p>
                <span className={styles.fileTypes}>JPG, PNG, GIF up to 10MB</span>
              </>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {photos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={styles.photoGrid}
          >
            {photos.map((photo) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={styles.photoItem}
              >
                <div className={styles.photoPreview}>
                  <img 
                    src={photo.url} 
                    alt={photo.name}
                    className={styles.photoImage}
                  />
                  <button
                    onClick={() => removePhoto(photo.id)}
                    className={styles.removeButton}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className={styles.photoInfo}>
                  <span className={styles.photoName}>{photo.name}</span>
                  <span className={styles.photoSize}>{formatFileSize(photo.size)}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {photos.length >= maxPhotos && (
        <div className={styles.maxPhotosMessage}>
          <AlertCircle size={16} />
          <span>Maximum {maxPhotos} photos reached</span>
        </div>
      )}
    </div>
  )
}