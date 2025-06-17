document.addEventListener('DOMContentLoaded', () => {
    // Restore page refresh protection - keep it active always
    window.addEventListener('beforeunload', (e) => {
        if (files.length > 0) {
            e.preventDefault();
            e.returnValue = 'You have uploaded files. Are you sure you want to leave?';
            return 'You have uploaded files. Are you sure you want to leave?';
        }
    });
    
    // DOM Elements
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const fileList = document.getElementById('file-list');
    const fileListSection = document.getElementById('file-list-section');
    const fileCountElement = document.getElementById('file-count');
    const totalSizeElement = document.getElementById('total-size');
    const mergeBtn = document.getElementById('merge-btn');
    const clearBtn = document.getElementById('clear-btn');
    const resultSection = document.getElementById('result-section');
    const downloadBtn = document.getElementById('download-btn');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressPercentage = document.getElementById('progress-percentage');

    // Global variables
    let files = [];
    let mergedFileId = null;
    let draggedItem = null;

    // Initialize
    initDragAndDrop();
    initEventListeners();

    // Initialize drag and drop functionality
    function initDragAndDrop() {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, unhighlight, false);
        });

        dropArea.addEventListener('drop', handleDrop, false);
    }

    // Initialize event listeners
    function initEventListeners() {
        dropArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileSelect);
        clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            clearFiles();
        });
        // FIXED MERGE BUTTON - prevent any navigation/submission
        mergeBtn.addEventListener('click', fixedMergeHandler);
        downloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            downloadMergedFile();
        });
        
        // Prevent any form submission on the entire page
        document.addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });
    }

    // Prevent default behaviors for drag and drop
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop area when dragging over
    function highlight() {
        dropArea.classList.add('highlight');
        dropArea.style.borderColor = 'var(--secondary)';
        dropArea.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3)';
    }

    // Remove highlight from drop area
    function unhighlight() {
        dropArea.classList.remove('highlight');
        dropArea.style.borderColor = 'var(--primary)';
        dropArea.style.boxShadow = '';
    }

    // Handle file drop
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const newFiles = [...dt.files];
        processFiles(newFiles);
    }

    // Handle file selection from input
    function handleFileSelect(e) {
        const newFiles = [...e.target.files];
        processFiles(newFiles);
        fileInput.value = ''; // Reset file input
    }

    // Process selected files
    function processFiles(newFiles) {
        // Filter only PDF files
        const pdfFiles = newFiles.filter(file => file.type === 'application/pdf');
        
        if (pdfFiles.length === 0) {
            showNotification('Please select PDF files only', 'error');
            return;
        }

        // Add files to the global files array
        files = [...files, ...pdfFiles];
        
        // Update UI
        updateFileStats();
        renderFileList();
        
        // Show file list section if hidden
        if (fileListSection.classList.contains('hidden')) {
            fileListSection.classList.remove('hidden');
        }
    }

    // Update file statistics
    function updateFileStats() {
        fileCountElement.textContent = files.length;
        
        const totalSize = files.reduce((acc, file) => acc + file.size, 0);
        totalSizeElement.textContent = formatFileSize(totalSize);
    }

    // Render file list
    function renderFileList() {
        fileList.innerHTML = '';
        
        files.forEach((file, index) => {
            const fileItem = document.createElement('li');
            fileItem.className = 'file-item';
            fileItem.setAttribute('data-index', index);
            fileItem.draggable = true;
            
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-icon">
                        <i class="fas fa-file-pdf"></i>
                    </div>
                    <div>
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${formatFileSize(file.size)}</div>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="file-action-btn move-up" title="Move Up">
                        <i class="fas fa-arrow-up"></i>
                    </button>
                    <button class="file-action-btn move-down" title="Move Down">
                        <i class="fas fa-arrow-down"></i>
                    </button>
                    <button class="file-action-btn delete" title="Remove">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            
            // Add event listeners for file item actions
            fileItem.querySelector('.move-up').addEventListener('click', () => moveFile(index, -1));
            fileItem.querySelector('.move-down').addEventListener('click', () => moveFile(index, 1));
            fileItem.querySelector('.delete').addEventListener('click', () => removeFile(index));
            
            // Add drag and drop event listeners
            fileItem.addEventListener('dragstart', handleDragStart);
            fileItem.addEventListener('dragend', handleDragEnd);
            fileItem.addEventListener('dragover', handleDragOver);
            fileItem.addEventListener('drop', handleFileDrop);
            
            fileList.appendChild(fileItem);
        });
    }

    // Format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Move file up or down in the list
    function moveFile(index, direction) {
        if ((index === 0 && direction === -1) || (index === files.length - 1 && direction === 1)) {
            return;
        }
        
        const newIndex = index + direction;
        [files[index], files[newIndex]] = [files[newIndex], files[index]];
        
        renderFileList();
    }

    // Remove file from the list
    function removeFile(index) {
        files.splice(index, 1);
        
        updateFileStats();
        renderFileList();
        
        if (files.length === 0) {
            fileListSection.classList.add('hidden');
        }
    }

    // Clear all files
    function clearFiles() {
        files = [];
        updateFileStats();
        fileListSection.classList.add('hidden');
    }

    // Handle drag start for file items
    function handleDragStart(e) {
        draggedItem = this;
        this.classList.add('dragging');
        
        // For Firefox compatibility
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
    }

    // Handle drag end for file items
    function handleDragEnd() {
        this.classList.remove('dragging');
        draggedItem = null;
    }

    // Handle drag over for file items
    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    // Handle drop for file items
    function handleFileDrop(e) {
        e.preventDefault();
        
        if (draggedItem !== this) {
            const fromIndex = parseInt(draggedItem.getAttribute('data-index'));
            const toIndex = parseInt(this.getAttribute('data-index'));
            
            // Reorder files array
            const movedFile = files[fromIndex];
            files.splice(fromIndex, 1);
            files.splice(toIndex, 0, movedFile);
            
            renderFileList();
        }
    }

    // FIXED MERGE HANDLER - Prevent navigation while keeping popup protection
    function fixedMergeHandler(event) {
        // Prevent any default button behavior that might cause navigation
        event.preventDefault();
        event.stopPropagation();
        
        // Validate files
        if (files.length < 2) {
            showNotification('Please select at least 2 PDF files to merge', 'error');
            return false;
        }
        
        // Execute merge without any navigation
        executeMergeWithoutNavigation();
        
        return false;
    }
    
    // EXECUTE MERGE WITHOUT NAVIGATION
    function executeMergeWithoutNavigation() {
        // Show progress container
        progressContainer.classList.remove('hidden');
        
        // Reset progress bar
        progressBar.style.width = '0%';
        progressPercentage.textContent = '0%';
        
        // Create FormData object
        const formData = new FormData();
        files.forEach((file, index) => {
            formData.append('files', file);
            formData.append('fileOrder', index);
        });
        
        // Start progress animation
        const progressInterval = simulateProgress();
        
        // Send files to backend using fetch (not form submission)
        fetch('http://localhost:3000/api/merge', {
            method: 'POST',
            body: formData,
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Server responded with an error');
            }
            return response.json();
        })
        .then(data => {
            // Clear the progress interval
            clearInterval(progressInterval);
            
            // Store the file ID for download
            mergedFileId = data.fileId;
            
            // Complete progress animation
            progressBar.style.width = '100%';
            progressPercentage.textContent = '100%';
            
            // Hide progress container after a short delay
            setTimeout(() => {
                progressContainer.classList.add('hidden');
                
                // Show result section
                resultSection.classList.remove('hidden');
                
                // Add glitch animation to success icon
                const successIcon = document.querySelector('.success-icon');
                if (successIcon) {
                    successIcon.classList.add('glitch');
                }
                
                // Scroll to result section
                resultSection.scrollIntoView({ behavior: 'smooth' });
                
                // Show success notification
                showNotification('PDFs merged successfully!', 'success');
            }, 1000);
        })
        .catch(error => {
            console.error('Error merging PDFs:', error);
            
            // Clear the progress interval
            clearInterval(progressInterval);
            
            // Hide progress container
            progressContainer.classList.add('hidden');
            
            // Show error notification
            showNotification('Failed to merge PDFs. Please try again.', 'error');
        });
    }

    // Simulate progress for demonstration
    function simulateProgress() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 8 + 2; // Slower, more realistic progress
            if (progress >= 95) {
                progress = 95; // Stop at 95% to wait for actual completion
                clearInterval(interval);
            }
            
            progressBar.style.width = `${progress}%`;
            progressPercentage.textContent = `${Math.round(progress)}%`;
        }, 300); // Slower animation
        
        return interval; // Return interval ID for cleanup
    }

    // Download merged file
    function downloadMergedFile() {
        if (!mergedFileId) {
            showNotification('No merged file available', 'error');
            return;
        }
        
        // Show loading notification
        showNotification('Preparing download...', 'success');
        
        // Fetch file details from the server
        fetch(`http://localhost:3000/api/pdfs/${mergedFileId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Server responded with an error');
                }
                return response.json();
            })
            .then(data => {
                // Open the PDF in a new tab for preview
                const newTab = window.open(data.file_url, '_blank');
                
                // Fallback: If popup blocker prevents new tab, create download link
                if (!newTab) {
                    // Create a temporary link element for download
                    const link = document.createElement('a');
                    link.href = data.file_url;
                    link.download = data.filename || 'merged-document.pdf';
                    link.target = '_blank';
                    
                    // Append to the document
                    document.body.appendChild(link);
                    
                    // Trigger click event
                    link.click();
                    
                    // Clean up
                    document.body.removeChild(link);
                    
                    showNotification('Download started! If the file didn\'t open, check your downloads folder.', 'success');
                } else {
                    showNotification('PDF opened in new tab for preview!', 'success');
                }
            })
            .catch(error => {
                console.error('Error downloading file:', error);
                showNotification('Failed to download file. Please try again.', 'error');
            });
    }

    // Show notification
    function showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // Add notification styles
    addNotificationStyles();

    // Add notification styles to document
    function addNotificationStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: var(--surface);
                border-left: 4px solid;
                padding: 15px 20px;
                border-radius: 4px;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                z-index: 1000;
                transform: translateX(120%);
                transition: transform 0.3s ease;
                max-width: 350px;
            }
            
            .notification.show {
                transform: translateX(0);
            }
            
            .notification.success {
                border-left-color: var(--primary);
            }
            
            .notification.error {
                border-left-color: #ff3333;
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .notification i {
                font-size: 1.2rem;
            }
            
            .notification.success i {
                color: var(--primary);
            }
            
            .notification.error i {
                color: #ff3333;
            }
        `;
        document.head.appendChild(style);
    }
});
