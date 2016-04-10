ffmpeg = global.get('ffmpeg');

if(!msg.ffmpeg){
    node.console.error('Not msg.ffmpeg');
    return;
}
if(!msg.ffmpeg.audio){
    node.console.error('Not msg.ffmpeg.audio');
    return;
}
if(!msg.ffmpeg.image){
    node.console.error('Not msg.ffmpeg.image');
    return;
}
if(!msg.ffmpeg.endimage){
    node.console.error('Not msg.ffmpeg.endimage');
    return;
}
if(!msg.ffmpeg.horoscope){
    node.console.error('Not msg.ffmpeg.horoscope');
    return;
}

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
            fontfile: '../font1.ttf',
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
        node.error(err);
        console.log('error: ' + err.message);
        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);
        try{
            if(command && command.kill)
                command.kill();
        }catch(tryerr){
            console.log(tryerr);
        }
        return null;
    })
    .on('start', function(commandLine) {
        console.log('Spawned Ffmpeg with command: ' + commandLine);
    })
    .on('end', function() {
        console.log('Finished processing');
        node.status({text:'done'});
        node.send(msg);
    })
    .on('progress', function(progress) {
        console.log(progress.timemark);
        node.status({text:""+(100 * progress.timemark / totalTime).toFixed(2) + '% done'});
    })
    .complexFilter(complexFilters)
    .outputOptions('-strict experimental')
//    .outputOptions('-tune stillimage')
//    .outputOptions('-shortest')
    .duration(totalTime)
    .toFormat('mp4')
    .save('out.mp4');

node.on('close', function(e){
    try{
        if(command && command.kill)
            command.kill();
    }catch(err){
        console.log(err);
    }
});
