import { $, $$ } from './dollar';
import { Promise } from 'es6-promise';

var fileInput = $.create('input') as HTMLInputElement;
var resolveFunction: null | ((file: File | null) => void);
var rejectFunction: null | ((err: Error) => void);

fileInput.type = 'file';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

fileInput.onchange = e => {
    var file = fileInput.files![0];  

    if (resolveFunction) {
        resolveFunction(file);
    } else {
        throw Error('File was loaded without a pending error');
    }

    resolveFunction = rejectFunction = null;
};
fileInput.onerror = e => {
    if (rejectFunction) {
        var msg = (e as any).message || 'The file failed to load';
        if (typeof e === 'string') msg = e;
        rejectFunction(msg);
    } else {
        throw Error('File was loaded without a pending error');
    }

    resolveFunction = rejectFunction = null;
};



/** 
 * Shows the file dialog and returns a promise that resolves when the user
 * selects a file, or rejects if the file dialog returns an error. NOTE that
 * if the user cancels the file dialog, the promise will not resolve until
 * the user re-opens the file dialog, at which point it will resolve to null.
 */
export function showFileDialog() {
    if (resolveFunction) {
        resolveFunction(null);
        resolveFunction = rejectFunction = null;
    }

    return new Promise<File | null>((resolve, reject) => {
        resolveFunction = resolve;
        rejectFunction = reject;

        fileInput.click();
     });
}