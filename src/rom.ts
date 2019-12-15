/*

    Webpack/Babel/ES(over 9000 versions) is such a 
    shitty shitting shit-assed shit of a stack to 
    work with. The most basic things that should never
    ever fucking ever be a problem routinely blow up
    and go sideways. "What's a Promise? I DONT FUCKING
    KNOW, WHY DONT YOU TELL ME SEVENTEEN DIFFERENT WAYS
    AND I STILL WON'T GET IT." Do I specify in tsconfig?
    Do I install typings? Is it an option in my 
    webpack.config? My babel.rc? Probably depends on
    seventeen different factors including which version
    of which software your using and how they're mashed
    together, which way the wind is blowing, and what
    I had for dinner last night. FUCKING CHRIST.

*/

// import { Promise } from '../node_modules/es6-promise/es6-promise';
import { Promise } from 'es6-promise';
// import { Promise } from './promise';

type DataPromiseResolve = (result: ArrayBuffer) => void;
type DataPromiseReject = (err: Error) => void;

interface ReadQueueItem {
    offset: number;
    length: number;
    resolve: DataPromiseResolve;
    reject: DataPromiseReject;
}

export const maxRomSize = 0x200000;

export class ROM {
    /** Contains the ROM as a raw byte array if it is able to be loaded. Otherwise, null. */
    public rawData: ArrayLike<number> | null = null;
    public rawDataPromise: Promise<Uint8Array>;
    private reader = new FileReader();
    private isReading = false;
    private promise = {
        resolve:  null as DataPromiseResolve | null,
        reject:null as DataPromiseReject | null,
    };
    private readQueue: ReadQueueItem[] = [];

    public constructor(public readonly data: File | Blob) {
        this.reader.onload = e => this.onDataLoaded();
        this.reader.onerror = e => this.onDataError();

        this.rawDataPromise = this.getData(0, data.size)
            .then(data => new Uint8Array(data));
        
        this.rawDataPromise
            .then(data => this.rawData = data)    
            .catch(console.error);
    }

    public getData(offset: number, length: number) {
        return new Promise<ArrayBuffer>((resolve, reject) => {
            if (this.isReading) {
                this.readQueue.push({  offset, length, resolve, reject });
            } else {
                return this.doOneRead(offset, length, resolve, reject);
            }
        });
    }

    private onDataLoaded() {
        var resolve = this.promise.resolve;
        this.promise.resolve = this.promise.reject = null;
        this.isReading = false;

        resolve!(this.reader.result as ArrayBuffer);
        this.doNextRead();
    }

    private onDataError() {
        var reject = this.promise.reject;
        this.promise.resolve = this.promise.reject = null;
        this.isReading = false;

        reject!(new Error('Failed to read from ROM.'));
        this.doNextRead();
    }

    private doNextRead() {
        if (this.readQueue.length > 0) {
            var op = this.readQueue.shift()!;

            this.doOneRead(op.offset, op.length, op.resolve, op.reject);
        }
    }

    private doOneRead(offset: number, length: number, resolve: DataPromiseResolve, reject: DataPromiseReject) {
        console.log('reading');
        this.promise.resolve = resolve;
        this.promise.reject = reject;
        this.reader.readAsArrayBuffer(this.data.slice(offset, offset + length));
        
    }
}