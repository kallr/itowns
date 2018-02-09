/* global describe, it */
// import proj4 from 'proj4';
import assert from 'assert';
import { Euler } from 'three';
import OrientedImageDecoder, { STEREOPOLIS } from '../src/Core/Decoder/OrientedImageDecoder';
// import Coordinates from '../src/Core/Geographic/Coordinates';

// import Coordinates, { UNIT } from '../src/Core/Geographic/Coordinates';
var inputStereopolis = [
    {
        id: 482,
        easting: 651187.76,
        northing: 6861379.05,
        altitude: 39.39,
        heading: 176.117188,
        roll: 0.126007,
        pitch: 1.280821,
        date: '2014-06-16T12:31:34.841Z',
    },
    {
        id: 483,
        easting: 651187.63,
        northing: 6861376.21,
        altitude: 39.43,
        heading: 182.681473,
        roll: 0.251712,
        pitch: 1.253257,
        date: '2014-06-16T12:31:35.591Z',
    },
];

describe('Let s try unit tests !!', function () {
    // it('should fail if there is no function', function () {
    //     var inputParam = [];
    //     OrientedImageDecoder.decode(inputParam);
    // });

    it('should fail if param undefined or is not an array', function () {
        var inputParam;
        var succed = false;
        try {
            OrientedImageDecoder.decode(inputParam);
        } catch (e) {
            succed = true;
        }
        assert.equal(succed, true, 'Input param should be an array');
    });

    it('should return an array of Coordinates', function () {
        var result = OrientedImageDecoder.decode(inputStereopolis, STEREOPOLIS);

        assert.ok(result, 'decode result should be defined and not null');
        assert.equal(result instanceof Array, true, 'decode result should be an Array');
        assert.equal(result.length, 2, 'decode result should be an Array of 2 elements');
    });
});
