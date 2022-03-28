import { readFileSync, createWriteStream, WriteStream, readFile, ReadStream } from "fs";
import { fileSync, FileResultNoFd } from "tmp";
import { compile, run as format, Varcom } from "varcom.js";
import * as CSV from "comma-separated-values";

export default function (file: string) {
    try {
        init(file);

        for (fetch(); work.run.state !== "eof"; fetch());

        commit();
    } finally {
        finalize();
    }
}

// impl

let work: Work;
interface Work {
    src: Src;
    tmp: Tmp;
    run: Run;
}

interface Src {
    origin: string;
    lines: string[];
    seek: number;
}

interface Tmp {
    writer: WriteStream;
    dst: FileResultNoFd;
}

type State = "template symbol" | "table symbol" | "unroll symbol" | "keep" | "eof";
interface Run {
    state: State;
    symbol: number;
    template: Varcom[];
    table: Table;
}

interface Table {
    rows: string[];
    code: { [header in string]: string }[];
}


const symbols = {
    template: "# comment-unroll template",
    table: "# comment-unroll table",
    unroll: "# comment-unroll unroll",
    end: "# comment-unroll end",
} as const;

// methods 
function init(file: string) {
    const src = readFileSync(file, { encoding: "utf-8" });
    const dst = fileSync();
    const writer = createWriteStream(dst.name, { encoding: "utf-8" });

    work = {
        src: {
            origin: file,
            lines: src.split("\n"),
            seek: 0,
        },
        tmp: { dst, writer },
        run: {
            state: "keep",
            symbol: 0,
            template: [],
            table: { rows: [], code: [] }
        }
    };
}

function finalize() {
    const dst = work.tmp.writer;
    dst.end();
    dst.close();
}

async function commit() {
    const org = work.src.origin;

    // copy from tmp-file to original file

    // workaround: copy failed 
    // linux does not work rename, copy command such as unistd 
    // https://man7.org/linux/man-pages/man2/rename.2.html tells EXDEV
    // copyFileSync(tmp.name, org, constants.COPYFILE_FICLONE_FORCE);

    const tmp = await readtmp();
    const dst = createWriteStream(org, { encoding: "utf-8" });
    try {
        dst.write(tmp);
    } finally {
        dst.close();
    }
}

async function readtmp() {
    const tmp = work.tmp.dst.name;
    return new Promise<string>((resolve, reject) => readFile(tmp, { encoding: "utf-8" }, (err, data) => {
        if (err) {
            reject(err);
            return;
        }
        resolve(data);
    }));
}

/**
 * fetch single line and next seek as line
 */
function fetch() {
    stateup();
    switch (work.run.state) {
        case "keep":
            keep();
            break;
        case "template symbol":
            template();
            break;
        case "table symbol":
            table();
            break;
        case "unroll symbol":
            unroll();
            break;
    }
}

/**
 *  setup run.state from current line
 */
function stateup() {
    const src = work.src;

    if (src.seek >= src.lines.length) {
        work.run = {
            state: "eof",
            symbol: 0,
            table: { rows: [], code: [] },
            template: [],
        };
        return;
    }

    const run = work.run;
    const line = src.lines[src.seek];
    if (line.includes(symbols.template)) {
        run.state = "template symbol";
        run.symbol = 0;
        run.template = [];
    } else if (line.includes(symbols.table)) {
        run.state = "table symbol";
        run.symbol = 0;
        run.table = { rows: [], code: [] };
    } else if (line.includes(symbols.unroll)) {
        run.state = "unroll symbol";
        run.symbol = 0;
    } else if (line.includes(symbols.end)) {
        symbolend();
        run.state = "keep";
        run.symbol = 0;
    }
}

function symbolend() {
    const run = work.run;
    switch (run.state) {
        case "table symbol":
            endtable();
            break;
    }
}

// actions for symbols

function keep() {
    copy();
    next();
}

function template() {
    const src = work.src;
    const run = work.run;
    const line = src.lines[src.seek];

    if (run.symbol) {
        run.template.push(compile(line));
    }
    run.symbol++;

    copy()
    next();
}

function table() {
    const src = work.src;
    const run = work.run;
    const line = src.lines[src.seek];

    if (run.symbol) {
        run.table.rows.push(line.trim());
    }
    run.symbol++;

    copy();
    next();
}

function endtable() {
    const table = work.run.table;
    table.code = new CSV(table.rows.join("\r\n"), { cast: false, header: true }).parse();
}

function unroll() {
    const src = work.src;
    const dst = work.tmp.writer;
    const run = work.run;
    const line = src.lines[src.seek];
    const template = run.template;
    const table = run.table.code;

    // copy begin symbol and skip end
    // fill templates between its

    // symbol
    copy();

    // template output
    table.forEach(row => {
        template.forEach(temp => {
            dst.write(format(temp, row));
            dst.write("\n");
        });
    });

    // skip to next symbol
    for (; run.state === "unroll symbol"; next(), stateup());
}


// helpers

function copy() {
    const src = work.src;
    const dst = work.tmp.writer;
    const line = src.lines[src.seek];

    dst.write(line);
    dst.write("\n");
}

function next() {
    const src = work.src;
    src.seek++;
}