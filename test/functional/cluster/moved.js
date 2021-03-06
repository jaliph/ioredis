var calculateSlot = require('cluster-key-slot');
var disconnect = require('./_helpers').disconnect;

describe('cluster:MOVED', function () {
  it('should auto redirect the command to the correct nodes', function (done) {
    var moved = false;
    var times = 0;
    var slotTable = [
      [0, 1, ['127.0.0.1', 30001]],
      [2, 16383, ['127.0.0.1', 30002]]
    ];
    var node1 = new MockServer(30001, function (argv) {
      if (argv[0] === 'cluster' && argv[1] === 'slots') {
        return slotTable;
      }
      if (argv[0] === 'get' && argv[1] === 'foo') {
        if (times++ === 1) {
          expect(moved).to.eql(true);
          process.nextTick(function () {
            cluster.disconnect();
            disconnect([node1, node2], done);
          });
        }
      }
    });
    var node2 = new MockServer(30002, function (argv) {
      if (argv[0] === 'cluster' && argv[1] === 'slots') {
        return slotTable;
      }
      if (argv[0] === 'get' && argv[1] === 'foo') {
        expect(moved).to.eql(false);
        moved = true;
        return new Error('MOVED ' + calculateSlot('foo') + ' 127.0.0.1:30001');
      }
    });

    var cluster = new Redis.Cluster([
      { host: '127.0.0.1', port: '30001' }
    ]);
    cluster.get('foo', function () {
      cluster.get('foo');
    });
  });

  it('should be able to redirect a command to a unknown node', function (done) {
    var node1 = new MockServer(30001, function (argv) {
      if (argv[0] === 'cluster' && argv[1] === 'slots') {
        return [
          [0, 16383, ['127.0.0.1', 30001]]
        ];
      }
      if (argv[0] === 'get' && argv[1] === 'foo') {
        return new Error('MOVED ' + calculateSlot('foo') + ' 127.0.0.1:30002');
      }
    });
    var node2 = new MockServer(30002, function (argv) {
      if (argv[0] === 'cluster' && argv[1] === 'slots') {
        return [
          [0, 16381, ['127.0.0.1', 30001]],
          [16382, 16383, ['127.0.0.1', 30002]]
        ];
      }
      if (argv[0] === 'get' && argv[1] === 'foo') {
        return 'bar';
      }
    });
    var cluster = new Redis.Cluster([
      { host: '127.0.0.1', port: '30001' }
    ], { retryDelayOnFailover: 1 });
    cluster.get('foo', function (err, res) {
      expect(res).to.eql('bar');
      cluster.disconnect();
      disconnect([node1, node2], done);
    });
  });

  it('should auto redirect the command within a pipeline', function (done) {
    var moved = false;
    var times = 0;
    var slotTable = [
      [0, 1, ['127.0.0.1', 30001]],
      [2, 16383, ['127.0.0.1', 30002]]
    ];
    var node1 = new MockServer(30001, function (argv) {
      if (argv[0] === 'cluster' && argv[1] === 'slots') {
        return slotTable;
      }
      if (argv[0] === 'get' && argv[1] === 'foo') {
        if (times++ === 1) {
          expect(moved).to.eql(true);
          process.nextTick(function () {
            cluster.disconnect();
            disconnect([node1, node2], done);
          });
        }
      }
    });
    var node2 = new MockServer(30002, function (argv) {
      if (argv[0] === 'cluster' && argv[1] === 'slots') {
        return slotTable;
      }
      if (argv[0] === 'get' && argv[1] === 'foo') {
        expect(moved).to.eql(false);
        moved = true;
        return new Error('MOVED ' + calculateSlot('foo') + ' 127.0.0.1:30001');
      }
    });

    var cluster = new Redis.Cluster([
      { host: '127.0.0.1', port: '30001' }
    ], { lazyConnect: false });
    cluster.get('foo', function () {
      cluster.get('foo');
    });
  });
});
