"use client"

import * as React from "react"
import { Upload, X, File } from "lucide-react"

export function FileDropzone({
  onFilesChange,
  accept,
  multiple = true,
}: {
  onFilesChange?: (files: File[]) => void
  accept?: string
  multiple?: boolean
}) {
  const [files, setFiles] = React.useState<File[]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const next = Array.from(e.target.files)
      setFiles(next)
      onFilesChange?.(next)
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index)
      onFilesChange?.(next)
      return next
    })
  }

  return (
    <div className="w-full max-w-md space-y-4">
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted border-muted-foreground/25 transition-colors">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
        </div>
        <input 
          type="file" 
          multiple={multiple}
          accept={accept}
          className="hidden" 
          onChange={handleFileChange} 
        />
      </label>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center justify-between p-2 border rounded-md bg-background">
              <div className="flex items-center space-x-2 truncate">
                <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate">{file.name}</span>
              </div>
              <button 
                type="button"
                onClick={() => removeFile(i)}
                className="p-1 hover:bg-muted rounded-full"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}