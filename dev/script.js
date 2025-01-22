/**
 * 图片压缩工具主要功能实现
 */

// 获取DOM元素
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const previewContainer = document.getElementById('previewContainer');
const controlPanel = document.getElementById('controlPanel');
const originalImage = document.getElementById('originalImage');
const compressedImage = document.getElementById('compressedImage');
const originalSize = document.getElementById('originalSize');
const compressedSize = document.getElementById('compressedSize');
const qualitySlider = document.getElementById('quality');
const qualityValue = document.getElementById('qualityValue');
const compressBtn = document.getElementById('compressBtn');
const downloadBtn = document.getElementById('downloadBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const batchPreview = document.getElementById('batchPreview');
const imageList = document.getElementById('imageList');

// 新增变量
const compressAllBtn = document.getElementById('compressAllBtn');

// 当前处理的图片文件
let currentFile = null;

// 存储待处理的图片文件
let imageFiles = [];

// 添加模式标识
let currentMode = 'single'; // 'single' 或 'batch'

// 初始化事件监听
function initializeEvents() {
    // 点击上传区域触发文件选择
    dropZone.addEventListener('click', () => {
        fileInput.value = ''; // 清空input的值，确保可以重复选择同一文件
        fileInput.click();
    });

    // 文件拖拽
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = 'var(--primary-color)';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = '#DEDEDE';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = '#DEDEDE';
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFiles(files);
        }
    });

    // 文件选择
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFiles(files);
        }
    });

    // 质量滑块变化
    qualitySlider.addEventListener('input', (e) => {
        qualityValue.textContent = `${e.target.value}%`;
    });

    // 压缩按钮点击事件
    compressBtn.addEventListener('click', async () => {
        if (currentMode === 'single') {
            if (!currentFile) {
                alert('请先上传图片！');
                return;
            }
            compressBtn.disabled = true;
            await compressImage(currentFile.originalFile, qualitySlider.value / 100);
            compressBtn.disabled = false;
        } else {
            await compressAllImages();
        }
    });

    // 下载按钮点击事件
    downloadBtn.addEventListener('click', () => {
        if (!currentFile) {
            alert('请先上传图片！');
            return;
        }
        if (currentFile.status === '待处理') {
            alert('请先进行压缩图片！');
            return;
        }
        downloadCompressedImage();
    });

    // 批量下载按钮点击事件
    downloadAllBtn.addEventListener('click', () => {
        const uncompressedFiles = imageFiles.filter(item => item.status === '待处理');
        if (uncompressedFiles.length > 0) {
            alert('请先进行压缩图片！');
            return;
        }
        downloadAllImages();
    });
}

// 修改处理选择的文件函数
async function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('请选择图片文件！');
        return;
    }

    switchToSingleMode();
    currentFile = {
        originalFile: file,
        name: file.name,
        compressed: null,
        status: '待处理'
    };
    
    // 显示原图
    try {
        // 清理之前的 URL
        if (originalImage.src) {
            URL.revokeObjectURL(originalImage.src);
        }
        // 创建新的 URL 并显示原图
        const originalUrl = URL.createObjectURL(file);
        originalImage.src = originalUrl;
        originalSize.textContent = formatFileSize(file.size);

        // 清空压缩预览
        if (compressedImage.src) {
            URL.revokeObjectURL(compressedImage.src);
            compressedImage.src = '';
            compressedSize.textContent = '0 KB';
        }
    } catch (error) {
        console.error('预览图片失败:', error);
        alert('预览图片失败，请重试！');
    }
}

// 修改压缩图片函数
async function compressImage(file, quality) {
    try {
        const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            quality: quality
        };

        const compressedFile = await imageCompression(file, options);
        
        // 更新压缩后的文件和状态
        if (currentFile) {
            currentFile.compressed = compressedFile;
            currentFile.status = '已完成';
            
            // 更新压缩后的预览
            if (compressedImage.src) {
                URL.revokeObjectURL(compressedImage.src);
            }
            const compressedUrl = URL.createObjectURL(compressedFile);
            compressedImage.src = compressedUrl;
            compressedSize.textContent = formatFileSize(compressedFile.size);
        }
    } catch (error) {
        console.error('压缩失败:', error);
        alert('图片压缩失败，请重试！');
        if (currentFile) {
            currentFile.status = '压缩失败';
        }
    }
}

// 修改下载压缩后的图片函数
function downloadCompressedImage() {
    if (!currentFile) {
        alert('请先上传图片！');
        return;
    }
    
    if (currentFile.status === '待处理') {
        alert('请先进行压缩图片！');
        return;
    }
    
    if (!currentFile.compressed) {
        alert('压缩失败，请重试！');
        return;
    }

    const link = document.createElement('a');
    link.download = `compressed_${currentFile.name}`;
    const url = URL.createObjectURL(currentFile.compressed);
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 修改批量处理函数
function handleFiles(files) {
    if (!files || files.length === 0) {
        return;
    }

    if (files.length === 1) {
        handleFile(files[0]);
        return;
    }

    if (files.length > 10) {
        alert('一次最多只能上传10张图片！');
        return;
    }

    switchToBatchMode();
    imageFiles = [];
    imageList.innerHTML = '';
    
    Array.from(files).forEach((file, index) => {
        if (!file.type.startsWith('image/')) {
            alert(`文件 ${file.name} 不是图片格式！`);
            return;
        }
        
        imageFiles.push({
            file: file,
            compressed: null,
            index: index,
            status: '待处理'
        });
        
        const previewItem = createPreviewItem(file, index);
        imageList.appendChild(previewItem);
    });
}

// 创建预览项
function createPreviewItem(file, index) {
    const div = document.createElement('div');
    div.className = 'preview-item';
    
    // 创建预览图片的 URL
    const previewUrl = URL.createObjectURL(file);
    
    div.innerHTML = `
        <img src="${previewUrl}" alt="${file.name}">
        <div class="preview-info">
            <span class="filename">${file.name}</span>
            <span class="filesize">原始大小: ${formatFileSize(file.size)}</span>
            <span class="compressed-size" id="compressedSize${index}">压缩后: -</span>
        </div>
        <div class="preview-status" id="status${index}">待处理</div>
    `;

    // 图片加载完成后清理 URL
    const img = div.querySelector('img');
    img.onload = () => {
        URL.revokeObjectURL(previewUrl);
    };

    return div;
}

// 修改模式切换函数
function switchToSingleMode() {
    currentMode = 'single';
    previewContainer.style.display = 'grid';
    batchPreview.style.display = 'none';
    controlPanel.style.display = 'block';
    downloadBtn.style.display = 'block';
    downloadAllBtn.style.display = 'none';
    compressBtn.textContent = '压缩图片';
}

function switchToBatchMode() {
    currentMode = 'batch';
    previewContainer.style.display = 'none';
    batchPreview.style.display = 'block';
    controlPanel.style.display = 'block';
    downloadBtn.style.display = 'none';
    downloadAllBtn.style.display = 'block';
    compressBtn.textContent = '压缩所有图片';
}

// 修改压缩所有图片函数
async function compressAllImages() {
    compressBtn.disabled = true;
    
    for (let item of imageFiles) {
        const statusEl = document.getElementById(`status${item.index}`);
        const sizeEl = document.getElementById(`compressedSize${item.index}`);
        const previewItem = document.querySelector(`.preview-item:nth-child(${item.index + 1})`);
        
        try {
            statusEl.textContent = '压缩中...';
            item.status = '压缩中';
            
            const quality = qualitySlider.value / 100;
            const compressedFile = await imageCompression(item.file, {
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                quality: quality
            });
            
            item.compressed = compressedFile;
            item.status = '已完成';
            statusEl.textContent = '已完成';
            sizeEl.textContent = `压缩后: ${formatFileSize(compressedFile.size)}`;

            // 更新预览图片
            const img = previewItem.querySelector('img');
            if (img.src) {
                URL.revokeObjectURL(img.src);
            }
            img.src = URL.createObjectURL(compressedFile);
        } catch (error) {
            console.error('压缩失败:', error);
            item.status = '压缩失败';
            statusEl.textContent = '压缩失败';
        }
    }
    
    compressBtn.disabled = false;
}

// 修改下载所有图片函数
function downloadAllImages() {
    const compressedFiles = imageFiles.filter(item => item.compressed);
    if (compressedFiles.length === 0) {
        alert('没有可下载的压缩图片！');
        return;
    }

    compressedFiles.forEach(item => {
        const link = document.createElement('a');
        link.download = `compressed_${item.file.name}`;
        const url = URL.createObjectURL(item.compressed);
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });
}

// 初始化应用
initializeEvents();  