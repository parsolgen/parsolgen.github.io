# ParSolGen v0.5-alpha + PySol development container.
#
# Toolchain (built from source, checksums pinned below):
#   GCC 15.2.0, Python 3.10.12, MPICH 5.0.0, Boost 1.90.0
#
# Build:  docker build -t parsolgen:0.5-alpha docker/
# Run:    docker run --rm -it parsolgen:0.5-alpha
# Test:   docker run --rm parsolgen:0.5-alpha python3 run_tests.py

FROM ubuntu:22.04

# Parallel make jobs for the source builds (GCC is the slow one).
ARG JOBS=8

ARG GCC_VERSION=15.2.0
ARG GCC_SHA256=7294d65cc1a0558cb815af0ca8c7763d86f7a31199794ede3f630c0d1b0a5723
ARG PYTHON_VERSION=3.10.12
ARG PYTHON_SHA256=afb74bf19130e7a47d10312c8f5e784f24e0527981eab68e20546cfb865830b8
ARG MPICH_VERSION=5.0.0
ARG MPICH_SHA256=e9350e32224283e95311f22134f36c98e3cd1c665d17fae20a6cc92ed3cffe11
ARG BOOST_VERSION=1.90.0
ARG BOOST_SHA256=5e93d582aff26868d581a52ae78c7d8edf3f3064742c6e77901a1f18a437eea9
ARG GKLIB_COMMIT=3b7d61b9f885063c89901f3901fb4426f9cfb58f
ARG PARSOLGEN_VERSION=v0.5-alpha
ARG PARSOLGEN_SHA256=cdb7d5df020c54cf6e1cc14fcca2a438496cc6148eda55f20a80d86409c8f55b
ARG PYSOL_REPO=https://github.com/parsolgen/pysol.git
ARG PYSOL_REF=main

ENV DEBIAN_FRONTEND=noninteractive

# Build prerequisites. The distribution's gcc only bootstraps GCC 15 and
# Python; everything else is compiled with GCC 15.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential ca-certificates cmake curl file git xz-utils \
        libgmp-dev libmpfr-dev libmpc-dev \
        libbz2-dev libffi-dev liblzma-dev libncursesw5-dev libreadline-dev \
        libsqlite3-dev libssl-dev uuid-dev zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# ---- Python 3.10.12 -----------------------------------------------------------
# Built with the distribution's gcc. CPython only warns when an optional module
# fails to build; pysol_run needs ctypes, so the import check at the end turns
# a missing module into a failed image build.
RUN curl -fsSL --retry 5 --retry-all-errors --retry-delay 10 -o /tmp/python.tar.xz \
        https://www.python.org/ftp/python/${PYTHON_VERSION}/Python-${PYTHON_VERSION}.tar.xz \
    && echo "${PYTHON_SHA256}  /tmp/python.tar.xz" | sha256sum -c - \
    && mkdir /tmp/python && tar xJf /tmp/python.tar.xz -C /tmp/python --strip-components=1 \
    && cd /tmp/python \
    && ./configure --prefix=/usr/local --enable-shared --with-ensurepip=install \
        LDFLAGS="-Wl,-rpath,/usr/local/lib" \
    && make -j"${JOBS}" && make install \
    && ldconfig \
    && cd / && rm -rf /tmp/python /tmp/python.tar.xz \
    && python3 --version | grep -qx "Python ${PYTHON_VERSION}" \
    && python3 -c "import ctypes, ssl, sqlite3, lzma, bz2, readline, uuid, zlib"

# ---- GCC 15.2.0 ---------------------------------------------------------------
RUN curl -fsSL --retry 5 --retry-all-errors --retry-delay 10 -o /tmp/gcc.tar.gz \
        https://ftp.gnu.org/gnu/gcc/gcc-${GCC_VERSION}/gcc-${GCC_VERSION}.tar.gz \
    && echo "${GCC_SHA256}  /tmp/gcc.tar.gz" | sha256sum -c - \
    && mkdir -p /tmp/gcc/build && tar xzf /tmp/gcc.tar.gz -C /tmp/gcc --strip-components=1 \
    && cd /tmp/gcc/build \
    && ../configure --prefix=/opt/gcc-${GCC_VERSION} --enable-languages=c,c++ \
        --disable-multilib --disable-bootstrap \
    && make -j"${JOBS}" && make install-strip \
    && cd / && rm -rf /tmp/gcc /tmp/gcc.tar.gz

ENV PATH=/opt/gcc-${GCC_VERSION}/bin:${PATH}
# "00-" sorts before the system entries, so GCC 15's libstdc++ (needed by
# libPSRts and sgc) wins over the older one shipped with Ubuntu.
RUN echo /opt/gcc-${GCC_VERSION}/lib64 > /etc/ld.so.conf.d/00-gcc.conf && ldconfig \
    && gcc --version | grep -q " ${GCC_VERSION}"

# ---- MPICH 5.0.0 --------------------------------------------------------------
RUN curl -fsSL --retry 5 --retry-all-errors --retry-delay 10 -o /tmp/mpich.tar.gz \
        https://github.com/pmodels/mpich/releases/download/v${MPICH_VERSION}/mpich-${MPICH_VERSION}.tar.gz \
    && echo "${MPICH_SHA256}  /tmp/mpich.tar.gz" | sha256sum -c - \
    && mkdir /tmp/mpich && tar xzf /tmp/mpich.tar.gz -C /tmp/mpich --strip-components=1 \
    && cd /tmp/mpich \
    && ./configure --prefix=/opt/mpich-${MPICH_VERSION} --disable-fortran CC=gcc CXX=g++ \
    && make -j"${JOBS}" && make install \
    && cd / && rm -rf /tmp/mpich /tmp/mpich.tar.gz

ENV PATH=/opt/mpich-${MPICH_VERSION}/bin:${PATH}
RUN echo /opt/mpich-${MPICH_VERSION}/lib > /etc/ld.so.conf.d/10-mpich.conf && ldconfig

# ---- Boost 1.90.0 (sgc needs program_options and container) --------------------
RUN curl -fsSL --retry 5 --retry-all-errors --retry-delay 10 -o /tmp/boost.tar.gz \
        https://archives.boost.io/release/${BOOST_VERSION}/source/boost_$(echo ${BOOST_VERSION} | tr . _).tar.gz \
    && echo "${BOOST_SHA256}  /tmp/boost.tar.gz" | sha256sum -c - \
    && mkdir /tmp/boost && tar xzf /tmp/boost.tar.gz -C /tmp/boost --strip-components=1 \
    && cd /tmp/boost \
    && ./bootstrap.sh --prefix=/opt/boost-${BOOST_VERSION} --with-toolset=gcc \
        --with-libraries=program_options,container \
    && ./b2 -j"${JOBS}" toolset=gcc variant=release link=shared threading=multi install \
    && cd / && rm -rf /tmp/boost /tmp/boost.tar.gz

RUN echo /opt/boost-${BOOST_VERSION}/lib > /etc/ld.so.conf.d/10-boost.conf && ldconfig

# ---- GKlib ----------------------------------------------------------------------
# libPSRts.so uses GKlib (gk_malloc, gk_jbufs, ...) without listing it as a
# dependency, so every program linked against it must also link -lGKlib.
# GKlib has no releases; the commit hash pins the exact source.
RUN git clone https://github.com/KarypisLab/GKlib.git /tmp/gklib \
    && git -C /tmp/gklib checkout ${GKLIB_COMMIT} \
    && cmake -S /tmp/gklib -B /tmp/gklib/build -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_C_COMPILER=gcc -DCMAKE_INSTALL_PREFIX=/opt/gklib -DCMAKE_INSTALL_LIBDIR=lib \
    && cmake --build /tmp/gklib/build -j"${JOBS}" \
    && cmake --install /tmp/gklib/build \
    && rm -rf /tmp/gklib \
    && test -f /opt/gklib/lib/libGKlib.a

# ---- ParSolGen v0.5-alpha -----------------------------------------------------
RUN curl -fsSL --retry 5 --retry-all-errors --retry-delay 10 -o /tmp/parsolgen.tar.gz \
        https://github.com/parsolgen/ParSolGenHome/releases/download/${PARSOLGEN_VERSION}/ps-release-${PARSOLGEN_VERSION}.tar.gz \
    && echo "${PARSOLGEN_SHA256}  /tmp/parsolgen.tar.gz" | sha256sum -c - \
    && mkdir /opt/parsolgen && tar xzf /tmp/parsolgen.tar.gz -C /opt/parsolgen --strip-components=1 \
    && rm /tmp/parsolgen.tar.gz \
    && echo /opt/parsolgen/lib > /etc/ld.so.conf.d/10-parsolgen.conf && ldconfig \
    && ldd /opt/parsolgen/bin/sgc /opt/parsolgen/lib/libPSRts.so | (! grep "not found")

ENV PATH=/opt/parsolgen/bin:${PATH}

# ---- PySol --------------------------------------------------------------------
# numpy is used by examples/simple/growing_array_race_test.py.
RUN git clone ${PYSOL_REPO} /opt/pysol \
    && git -C /opt/pysol checkout ${PYSOL_REF} \
    && python3 -m pip install --no-cache-dir --upgrade pip \
    && python3 -m pip install --no-cache-dir -e "/opt/pysol[dev]" numpy

# Every example loads ./config.json; point them all at this container's toolchain.
COPY pysol-config.json /opt/pysol/config.json
RUN for d in /opt/pysol/examples/*/; do cp /opt/pysol/config.json "$d/config.json"; done

WORKDIR /opt/pysol/examples/simple

# Smoke test: build fails unless every test in examples/simple passes.
# Skip with --build-arg RUN_TESTS=0. Generated files are removed afterwards.
ARG RUN_TESTS=1
RUN if [ "${RUN_TESTS}" = "1" ]; then \
        python3 run_tests.py \
        && git -C /opt/pysol clean -fdxq -e config.json -- examples/simple; \
    fi

CMD ["/bin/bash"]
