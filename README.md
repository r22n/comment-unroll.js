# comment-unroll.js
unroll table into code by template

simple usage
```
$npx comment-unroll src/path/to/your/code
```

expansion your format macro

```
import hoge from "fuga";

/*
# comment-unroll table
    type,message
    morning,good-morning
    evening,good-evening
    afternoon,good-afternoon
    wwwww,good-afternoon
# comment-unroll end
*/
switch(hoge) {
/*
# comment-unroll template
    case "${type}":
        console.log("${message}");
        break;
# comment-unroll end
*/
//# comment-unroll unroll
//# comment-unroll end
}
```

```
import hoge from "fuga";

/*
# comment-unroll table
    type,message
    morning,good-morning
    evening,good-evening
    afternoon,good-afternoon
    wwwww,good-afternoon
# comment-unroll end
*/
switch(hoge) {
/*
# comment-unroll template
    case "${type}":
        console.log("${message}");
        break;
# comment-unroll end
*/
//# comment-unroll unroll
    case "morning":
        console.log("good-morning");
        break;
    case "evening":
        console.log("good-evening");
        break;
    case "afternoon":
        console.log("good-afternoon");
        break;
    case "wwwww":
        console.log("good-afternoon");
        break;
//# comment-unroll end
}
```

# macros


## `# comment-unroll table`

- let state table fetching mode until `# comment-unroll end` lines

```
# comment-unroll table
    RFC4180 format table
# comment-unroll end
```

## `# comment-unroll template`

- let state template fetching mode until `# comment-unroll end` lines
- format follows [varcom.js](https://github.com/r22n/varcom.js)

```
# comment-unroll template
    varcom.js format text
# comment-unroll end
```

## `# comment-unroll unroll`

- overwrite between this and next `# comment-unroll end` by template 
- template applies all row of table

```
# comment-unroll unroll
    overrwrite txt. 
    do not type here if you need to save comments, codes, text etc...
# comment-unroll end
```