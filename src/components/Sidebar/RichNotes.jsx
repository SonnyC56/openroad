import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, 
  Bold, 
  Italic, 
  List, 
  Link2, 
  Eye, 
  Edit3,
  Save,
  X
} from 'lucide-react'
import styles from './RichNotes.module.css'

export const RichNotes = ({ notes = '', onNotesChange, placeholder = 'Add your notes here...' }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editorValue, setEditorValue] = useState(notes)
  const [isPreview, setIsPreview] = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    setEditorValue(notes)
  }, [notes])

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      // Auto-resize textarea
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [isEditing])

  const handleSave = () => {
    onNotesChange(editorValue)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditorValue(notes)
    setIsEditing(false)
  }

  const handleTextareaChange = (e) => {
    setEditorValue(e.target.value)
    // Auto-resize textarea
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  const insertFormat = (format) => {
    if (!textareaRef.current) return
    
    const start = textareaRef.current.selectionStart
    const end = textareaRef.current.selectionEnd
    const selectedText = editorValue.substring(start, end)
    
    let newText = editorValue
    let newCursorPos = start
    
    switch (format) {
      case 'bold':
        newText = editorValue.substring(0, start) + `**${selectedText}**` + editorValue.substring(end)
        newCursorPos = start + (selectedText ? 2 : 2)
        break
      case 'italic':
        newText = editorValue.substring(0, start) + `*${selectedText}*` + editorValue.substring(end)
        newCursorPos = start + (selectedText ? 1 : 1)
        break
      case 'list':
        const lines = editorValue.split('\n')
        const currentLineIndex = editorValue.substring(0, start).split('\n').length - 1
        lines[currentLineIndex] = `• ${lines[currentLineIndex]}`
        newText = lines.join('\n')
        newCursorPos = start + 2
        break
      case 'link':
        const linkText = selectedText || 'Link text'
        newText = editorValue.substring(0, start) + `[${linkText}](URL)` + editorValue.substring(end)
        newCursorPos = start + linkText.length + 3
        break
    }
    
    setEditorValue(newText)
    
    // Set cursor position after state update
    setTimeout(() => {
      textareaRef.current.selectionStart = newCursorPos
      textareaRef.current.selectionEnd = newCursorPos
      textareaRef.current.focus()
    }, 0)
  }

  const renderPreview = (text) => {
    if (!text) return <p className={styles.emptyPreview}>No notes added yet</p>
    
    // Simple markdown-like rendering
    let html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/^• (.*$)/gm, '<li>$1</li>')
    
    // Wrap list items in ul
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    
    // Convert line breaks to paragraphs
    html = html.split('\n\n').map(paragraph => 
      paragraph.trim() ? `<p>${paragraph.replace(/\n/g, '<br>')}</p>` : ''
    ).join('')
    
    return <div dangerouslySetInnerHTML={{ __html: html }} />
  }

  const hasContent = notes.trim().length > 0

  return (
    <div className={styles.richNotes}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <FileText size={16} />
          <span>Notes</span>
        </div>
        <div className={styles.headerRight}>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className={styles.editButton}
              title="Edit notes"
            >
              <Edit3 size={14} />
            </button>
          ) : (
            <div className={styles.editorActions}>
              <button
                onClick={() => setIsPreview(!isPreview)}
                className={`${styles.previewButton} ${isPreview ? styles.active : ''}`}
                title="Preview"
              >
                <Eye size={14} />
              </button>
              <button
                onClick={handleSave}
                className={styles.saveButton}
                title="Save"
              >
                <Save size={14} />
              </button>
              <button
                onClick={handleCancel}
                className={styles.cancelButton}
                title="Cancel"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="editor"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={styles.editorContainer}
          >
            {!isPreview && (
              <div className={styles.toolbar}>
                <button
                  onClick={() => insertFormat('bold')}
                  className={styles.toolbarButton}
                  title="Bold"
                >
                  <Bold size={14} />
                </button>
                <button
                  onClick={() => insertFormat('italic')}
                  className={styles.toolbarButton}
                  title="Italic"
                >
                  <Italic size={14} />
                </button>
                <button
                  onClick={() => insertFormat('list')}
                  className={styles.toolbarButton}
                  title="List"
                >
                  <List size={14} />
                </button>
                <button
                  onClick={() => insertFormat('link')}
                  className={styles.toolbarButton}
                  title="Link"
                >
                  <Link2 size={14} />
                </button>
              </div>
            )}

            {isPreview ? (
              <div className={styles.preview}>
                {renderPreview(editorValue)}
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={editorValue}
                onChange={handleTextareaChange}
                placeholder={placeholder}
                className={styles.editor}
                rows={4}
              />
            )}
          </motion.div>
        ) : hasContent ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.notesPreview}
          >
            {renderPreview(notes)}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.emptyState}
            onClick={() => setIsEditing(true)}
          >
            <FileText size={20} />
            <p>Click to add notes</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}