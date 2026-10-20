"""The conformance cases (cases.json) on the real Linux kernel: python3 real.py checks every case's outcome against
the expected one, the same outcome the simulated kernel must give (sim.js, run by npm test). Exit status 1 on any
difference. Linux only (fork, pipes, signals)."""
import json, os, signal, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
CASES = json.load(open(os.path.join(HERE, 'cases.json'), encoding='utf-8'))


def write_all(fd, data):
    data = data.encode()
    while data:
        data = data[os.write(fd, data):]


def read_all(fd):
    out = b''
    while True:
        chunk = os.read(fd, 16)
        if not chunk:
            return out.decode()
        out += chunk


def child(body):
    pid = os.fork()
    if pid == 0:
        try:
            code = body() or 0
        except BaseException:
            code = 99
        os._exit(code)
    return pid


def read_file(path):
    with open(path) as f:
        return f.read()


def case_fork_shares_offset(d):
    fd = os.open(f'{d}/f', os.O_WRONLY | os.O_CREAT | os.O_TRUNC)
    pid = child(lambda: write_all(fd, 'child\n'))
    os.waitpid(pid, 0)
    write_all(fd, 'parent\n')
    os.close(fd)
    return {'file': read_file(f'{d}/f')}


def case_dup_shares_offset(d):
    fd = os.open(f'{d}/f', os.O_WRONLY | os.O_CREAT | os.O_TRUNC)
    fd2 = os.dup(fd)
    os.write(fd, b'ab')
    os.write(fd2, b'cd')
    os.close(fd); os.close(fd2)
    return {'file': read_file(f'{d}/f')}


def case_unlink_while_open(d):
    open(f'{d}/f', 'w').write('hello')
    fd = os.open(f'{d}/f', os.O_RDONLY)
    os.unlink(f'{d}/f')
    read = os.read(fd, 100).decode()
    try:
        os.stat(f'{d}/f'); stat = 'exists'
    except FileNotFoundError:
        stat = 'ENOENT'
    return {'read': read, 'stat': stat}


def case_hard_link(d):
    open(f'{d}/a', 'w').close()
    os.link(f'{d}/a', f'{d}/b')
    links = os.stat(f'{d}/a').st_nlink
    open(f'{d}/b', 'w').write('data')
    through = read_file(f'{d}/a')
    os.unlink(f'{d}/a')
    return {'links': links, 'through': through, 'after': read_file(f'{d}/b')}


def case_rename_replaces(d):
    open(f'{d}/a', 'w').write('new'); open(f'{d}/b', 'w').write('old')
    os.rename(f'{d}/a', f'{d}/b')
    return {'b': read_file(f'{d}/b'), 'a': 'exists' if os.path.exists(f'{d}/a') else 'ENOENT'}


def pipe_case(close_parent_write_end):
    r, w = os.pipe()
    out_r, out_w = os.pipe()

    def body():
        os.close(w)
        write_all(out_w, read_all(r))
    pid = child(body)
    os.close(r); os.close(out_w)
    write_all(w, 'hi')
    if close_parent_write_end:
        os.close(w)
    # A reader that never sees end of file would wait for ever: give it a second.
    signal.signal(signal.SIGALRM, lambda *_: (_ for _ in ()).throw(TimeoutError()))
    signal.alarm(1)
    try:
        os.waitpid(pid, 0)
        stuck = False
    except TimeoutError:
        stuck = True
        os.kill(pid, signal.SIGKILL); os.waitpid(pid, 0)
    finally:
        signal.alarm(0)
    got = read_all(out_r)
    if not close_parent_write_end:
        os.close(w)
    return got, stuck


def case_pipe_eof_after_close(d):
    got, stuck = pipe_case(True)
    return {'child': got, 'stuck': stuck}


def case_pipe_open_write_end(d):
    return {'stuck': pipe_case(False)[1]}


def redirect(d, order):
    term_r, term_w = os.pipe()

    def body():
        os.dup2(term_w, 1); os.dup2(term_w, 2); os.close(term_w)
        for step in order:
            if step == 'file':
                fd = os.open(f'{d}/f', os.O_WRONLY | os.O_CREAT | os.O_TRUNC)
                os.dup2(fd, 1); os.close(fd)
            else:
                os.dup2(1, 2)
        write_all(1, 'out\n'); write_all(2, 'err\n')
    pid = child(body)
    os.close(term_w)
    terminal = read_all(term_r)
    os.waitpid(pid, 0)
    return {'file': read_file(f'{d}/f'), 'terminal': terminal}


def case_redirect_then_dup(d):
    return redirect(d, ['file', 'dup'])


def case_dup_then_redirect(d):
    return redirect(d, ['dup', 'file'])


def case_sigpipe(d):
    r, w = os.pipe()
    os.close(r)

    def body():
        signal.signal(signal.SIGPIPE, signal.SIG_DFL)
        os.write(w, b'x')
    pid = child(body)
    os.close(w)
    _, status = os.waitpid(pid, 0)
    return {'killedBySigpipe': os.WIFSIGNALED(status) and os.WTERMSIG(status) == signal.SIGPIPE}


def case_wait_status(d):
    pid = child(lambda: 3)
    _, status = os.waitpid(pid, 0)
    return {'status': os.WEXITSTATUS(status)}


problems = 0
for name, case in CASES.items():
    with tempfile.TemporaryDirectory() as d:
        got = globals()['case_' + name.replace('-', '_')](d)
    ok = got == case['expect']
    problems += not ok
    print(f"{'ok ' if ok else 'FAIL'} {name}" + ('' if ok else f": real Linux gives {got}, expected {case['expect']}"))
print('all cases ok' if not problems else f'{problems} case(s) differ')
sys.exit(1 if problems else 0)
