
#!/bin/bash
FQDN=$1


# make directories to work from
mkdir -p server/ client/ all/
echo "1. Creation des dossier. OK"


# Create your very own Root Certificate Authority
openssl genrsa -out all/my-private-root-ca.privkey.pem 2048
echo "2. Generation d'un privKey. OK"

# Self-sign your Root Certificate Authority
# Since this is private, the details can be as bogus as you like
openssl req -x509 -new -nodes -key all/my-private-root-ca.privkey.pem -days 1024 -out all/my-private-root-ca.cert.pem -subj "/C=US/ST=Utah/L=Provo/O=ACME Signing Authority Inc/CN=example.com"
echo "3. AutoSign la privKey. OK"

# Create a Device Certificate for each domain,

# such as example.com, *.example.com, awesome.example.com

# NOTE: You MUST match CN to the domain name or ip address you want to use
openssl genrsa -out all/privkey.pem 2048
echo "4. Generation de la key. OK"

# Create a request from your Device, which your Root CA will sign
openssl req -new -key all/privkey.pem -out all/csr.pem -subj "/C=US/ST=Utah/L=Provo/O=ACME Tech Inc/CN=${FQDN}"
echo "5. Setup de la cle. OK" + "( /C=US/ST=Utah/L=Provo/O=ACME Tech Inc/CN=${FQDN} )"

# Sign the request from Device with your Root CA
openssl x509 -req -in all/csr.pem -CA all/my-private-root-ca.cert.pem -CAkey all/my-private-root-ca.privkey.pem -CAcreateserial -out all/cert.pem -days 500
echo "6. Sign key with privKey. OK"

# Put things in their proper place
cp -r all/privkey.pem server/
cp -r all/cert.pem server/
cp -r all/cert.pem server/fullchain.pem # we have no intermediates in this case
cp -r all/my-private-root-ca.cert.pem server/
cp -r all/my-private-root-ca.cert.pem client/
echo "7. Deplacement des fichiers. OK"

# create DER format crt for iOS Mobile Safari, etc
openssl x509 -outform der -in all/my-private-root-ca.cert.pem -out client/my-private-root-ca.crt
echo "8. Creation .crt. OK"

echo "END"