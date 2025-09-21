import { useParams } from 'react-router';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import axiosClient from '../utils/axiosClient'
import { motion } from 'framer-motion';

function AdminUpload(){
    
    const {problemId}  = useParams();
    
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadedVideo, setUploadedVideo] = useState(null);
    
      const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
        reset,
        setError,
        clearErrors
      } = useForm();
    
      const selectedFile = watch('videoFile')?.[0];
    
      // Upload video to Cloudinary
      const onSubmit = async (data) => {
        const file = data.videoFile[0];
        
        setUploading(true);
        setUploadProgress(0);
        clearErrors();
    
        try {
          // Step 1: Get upload signature from backend
          const signatureResponse = await axiosClient.get(`/video/create/${problemId}`);
          const { signature, timestamp, public_id, api_key, cloud_name, upload_url } = signatureResponse.data;
    
          // Step 2: Create FormData for Cloudinary upload
          const formData = new FormData();
          formData.append('file', file);
          formData.append('signature', signature);
          formData.append('timestamp', timestamp);
          formData.append('public_id', public_id);
          formData.append('api_key', api_key);
    
          // Step 3: Upload directly to Cloudinary
          const uploadResponse = await axios.post(upload_url, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(progress);
            },
          });
    
          const cloudinaryResult = uploadResponse.data;
    
          // Step 4: Save video metadata to backend
          const metadataResponse = await axiosClient.post('/video/save', {
            problemId:problemId,
            cloudinaryPublicId: cloudinaryResult.public_id,
            secureUrl: cloudinaryResult.secure_url,
            duration: cloudinaryResult.duration,
          });
    
          setUploadedVideo(metadataResponse.data.videoSolution);
          reset(); // Reset form after successful upload
          
        } catch (err) {
          console.error('Upload error:', err);
          setError('root', {
            type: 'manual',
            message: err.response?.data?.message || 'Upload failed. Please try again.'
          });
        } finally {
          setUploading(false);
          setUploadProgress(0);
        }
      };
    
      // Format file size
      const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };
    
      // Format duration
      const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      };
    
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-md mx-auto w-full px-3"
          >
            <div className="card glass-effect shadow-2xl border border-purple-500/20">
              <div className="card-body p-3 sm:p-6">
                <motion.h2 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="card-title text-xl sm:text-2xl bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500"
                >
                  Upload Video
                </motion.h2>
                
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* File Input */}
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="form-control w-full"
                  >
                    <label className="label">
                      <span className="label-text text-gray-300">Choose video file</span>
                    </label>
                    <input
                      type="file"
                      accept="video/*"
                      {...register('videoFile', {
                        required: 'Please select a video file',
                        validate: {
                          isVideo: (files) => {
                            if (!files || !files[0]) return 'Please select a video file';
                            const file = files[0];
                            return file.type.startsWith('video/') || 'Please select a valid video file';
                          },
                          fileSize: (files) => {
                            if (!files || !files[0]) return true;
                            const file = files[0];
                            const maxSize = 100 * 1024 * 1024; // 100MB
                            return file.size <= maxSize || 'File size must be less than 100MB';
                          }
                        }
                      })}
                      className={`file-input file-input-bordered w-full bg-white/5 ${errors.videoFile ? 'file-input-error' : ''}`}
                      disabled={uploading}
                    />
                    {errors.videoFile && (
                      <label className="label">
                        <span className="label-text-alt text-error">{errors.videoFile.message}</span>
                      </label>
                    )}
                  </motion.div>
    
                  {/* Selected File Info */}
                  {selectedFile && (
                    <div className="alert alert-info">
                      <div>
                        <h3 className="font-bold">Selected File:</h3>
                        <p className="text-sm">{selectedFile.name}</p>
                        <p className="text-sm">Size: {formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                  )}
    
                  {/* Upload Progress */}
                  {uploading && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-2"
                    >
                      <div className="flex justify-between text-sm">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <progress 
                        className="progress progress-primary w-full" 
                        value={uploadProgress} 
                        max="100"
                      ></progress>
                    </motion.div>
                  )}
    
                  {/* Error Message */}
                  {errors.root && (
                    <div className="alert alert-error">
                      <span>{errors.root.message}</span>
                    </div>
                  )}
    
                  {/* Success Message */}
                  {uploadedVideo && (
                    <div className="alert alert-success">
                      <div>
                        <h3 className="font-bold">Upload Successful!</h3>
                        <p className="text-sm">Duration: {formatDuration(uploadedVideo.duration)}</p>
                        <p className="text-sm">Uploaded: {new Date(uploadedVideo.uploadedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
    
                  {/* Upload Button */}
                  <div className="card-actions justify-end">
                    <motion.button
                      type="submit"
                      disabled={uploading}
                      className={`btn btn-gradient text-white ${uploading ? 'loading' : ''}`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {uploading ? 'Uploading...' : 'Upload Video'}
                    </motion.button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
    );
}


export default AdminUpload;