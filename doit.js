ffmpeg = require('fluent-ffmpeg');

var msg = {};
msg.ffmpeg = {};
msg.ffmpeg.audio = "audio.mp3";
msg.ffmpeg.image = "images/scorpio.jpg";
msg.ffmpeg.endimage = "images/end.jpg";
msg.horoscope = "Here is some crazy text that will be used as horoscope. Second phrase. I will not die soon";
var phrases = msg.horoscope.split(". ");
var phraseDuration = 7;
var openingFadeDuration = 3;
var part1Duration = (phrases.length * phraseDuration) + openingFadeDuration;
var part2Duration = 15;
var blendDuration = 2;
var totalTime = part1Duration + blendDuration + part2Duration;
var complexFilters = [
    {
        filter: 'trim',
        options: {
            duration: part1Duration
        },
        inputs: '0:v',
        outputs: 'trim0'
    },
    {
        filter: 'fade',
        options: {
            type: 'in',
            start_time: 0,
            duration: openingFadeDuration
        },
        inputs: 'trim0',
        outputs: 'fadetrim0'
    },

    {
        filter: 'trim',
        options: {
            duration: blendDuration/2
        },
        inputs: '0:v',
        outputs: 'minitrim0'
    },
    {
        filter: 'trim',
        options: {
            duration: blendDuration/2
        },
        inputs: '1:v',
        outputs: 'minitrim1'
    },
    {
        filter: 'blend',
        options: {
            all_expr:'A*(if(gte(T,0.5),1,T/0.5))+B*(1-(if(gte(T,0.5),1,T/0.5)))'
        },
        inputs: ['minitrim1','minitrim0'],
        outputs: 'blend01'
    },

    {
        filter: 'trim',
        options: {
            duration: part2Duration
        },
        inputs: '1:v',
        outputs: 'trim1'
    },

    {
        filter: 'concat',
        options : {
            n: 3,
            v:1,
        },
        inputs: ['fadetrim0', 'blend01', 'trim1'],
        outputs: 'concated'
    }
];
phrases.forEach(function(e,i){
    var step = phraseDuration*i;
    var st = 0 + openingFadeDuration +step;
    var fin = 1.5;
    var fout = 2;
    var tot = phraseDuration + openingFadeDuration +step;
    var filter = {
        filter: 'drawtext',
        options: {
            fontfile: 'font.ttf',
            text: e,
            fontsize: 50,
            x:"(w-text_w)/2",
            y:"(h-text_h)/2",
            fontcolor_expr:"ff4400%{eif\\: clip(255*(1*between(t\, "+st+" + "+fin+"\, "+tot+" - "+fout+") + ((t - "+st+")/"+fin+")*between(t\, "+st+"\, "+st+" + "+fin+") + (-(t - "+tot+")/"+fout+")*between(t\, "+tot+" - "+fout+"\, "+tot+") )\, 0\, 255) \\: x\\: 2 }"
        }
    };
    if(i===0){
        filter.inputs = 'concated';
    }
    else {
        filter.inputs = 'textoutput' + (i-1) + '';
    }
    if(i<phrases.length-1) filter.outputs = 'textoutput' + i;
    complexFilters.push(filter);
});

var command = ffmpeg()
    .input(msg.ffmpeg.image)
    .loop()
    .input(msg.ffmpeg.endimage)
    .loop()
    .input(msg.ffmpeg.audio)
    .audioCodec('copy')
//    .audioCodec('aac')
    .videoCodec('libx264')
//    .size('?x480')
    .on('error', function(err, stdout, stderr) {
        console.log('error: ' + err.message);
        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);
    })
    .on('start', function(commandLine) {
        console.log('Spawned Ffmpeg with command: ' + commandLine);
    })
    .on('end', function() {
        console.log('Finished processing');
//        node.status({text:'done'})
//        node.send(msg);
    })
    .on('progress', function(progress) {
        console.log(progress.timemark);
        console.log('Processing: ' + progress.percent.toFixed(2) + '% done');
//        node.status({text:""+progress.percent.toFixed(2) + '% done'})
    })
    .complexFilter(complexFilters)
    .outputOptions('-strict experimental')
//    .outputOptions('-tune stillimage')
//    .outputOptions('-shortest')
    .duration(totalTime)
    .toFormat('mp4')
    .save('out.mp4');
/*
node.on('close', function(e){
    try{
        if(command && commqnd.kill)
            command.kill();
    }catch(err){

    }
});*/
