{-# LANGUAGE RankNTypes #-}
{-# LANGUAGE MultiParamTypeClasses #-}
{-# LANGUAGE PartialTypeSignatures #-}
{-# LANGUAGE AllowAmbiguousTypes, ScopedTypeVariables, TypeApplications, FlexibleInstances #-}
{-# LANGUAGE FlexibleContexts #-}
{-# OPTIONS_GHC -Wno-orphans #-}
{-# OPTIONS_GHC -Wno-redundant-constraints #-}
{-# LANGUAGE PolyKinds #-}
{-# LANGUAGE DerivingVia #-}
{-# LANGUAGE DataKinds #-}
{-# OPTIONS_GHC -Wno-deprecations #-}

module GetSet (
  get,
  getObj,
  getVal,
  setVal,
  setJson,
  new,
  typeBaseName,
  TypeBaseName,
  Constant(..)
) where

import Language.Javascript.JSaddle  (MakeObject, ToJSVal, JSVal, JSM, JSString, (!), (<#), toJSVal_aeson, FromJSVal (fromJSVal), FromJSString (fromJSString), MakeArgs, ghcjsPure, jsUndefined, isUndefined, syncPoint)
import qualified Language.Javascript.JSaddle as JSaddle
import GHC.OverloadedLabels (IsLabel (fromLabel))
import Universum ((>>=), Applicative (pure), ($), (<$>), error, Text, show, Semigroup ((<>)), whenM, Bool (True), undefined)
import GHC.Records (HasField (getField))
import Data.Aeson (ToJSON)
import Data.Typeable (Typeable, Proxy (Proxy), typeRep)
import FFI (deserializationFailure_, deserializationFailureUnsafe)
import Data.Maybe ( Maybe(Just, Nothing) )
import Control.Lens.Action (act)
import Control.Lens.Action.Type (IndexPreservingAction)
import Data.Text (tail, init)
import Shpadoinkle.Console (warn)
import Monadic (readProperty)


instance {-# INCOHERENT #-} HasField x r a => IsLabel x (r -> a) where
  fromLabel = getField @x

class TypeBaseName a where
  typeBaseName :: Text

instance {-# OVERLAPPABLE #-} Typeable a => TypeBaseName a where
  typeBaseName = init $ tail $ show (typeRep (Proxy :: Proxy a))

data Constant a = Constant
instance Typeable a => TypeBaseName (Constant a) where
  typeBaseName = init $ tail $ show (typeRep (Proxy :: Proxy a))

-- | typeBaseName
-- >>> data Foo = Foo
-- >>> data Bar a = Bar a deriving TypeBaseName via Constant "bar"
-- >>> data Baz = Baz deriving TypeBaseName via Constant "baz_overridden"
-- >>> typeBaseName @"foo"
-- >>> typeBaseName @(Bar _)
-- >>> typeBaseName @Baz
-- "foo"
-- "bar"
-- "baz_overridden"


get_ :: forall fieldname this res. HasField fieldname this (JSM res) => this -> JSM res
get_ = getField @fieldname

get :: forall fieldname this res. HasField fieldname this (JSM res) => IndexPreservingAction JSM this res
get = act (get_ @fieldname)

getObj :: (MakeObject this, ToJSVal this, FromJSVal jsval) => (jsval -> res) -> Text -> this -> JSM res
getObj c fieldname this = do
  jval <- readProperty fieldname this
  res <- fromJSVal jval
  case res of
    Nothing -> do
      deserializationFailureUnsafe jval fieldname
    Just r  -> do
      pure $ c r

getVal :: (MakeObject this, FromJSVal res) => Text -> this -> JSM res
getVal fieldname this = do
    jval <- this ! fieldname
    res <- fromJSVal jval
    case res of
      Nothing -> deserializationFailureUnsafe jval fieldname
      Just r  -> pure r

setVal_ :: forall fieldname this val. (TypeBaseName fieldname, MakeObject this, HasField fieldname this (JSM val), ToJSVal val) => val -> this -> JSM ()
setVal_ newval obj = obj <# typeBaseName @fieldname $ newval

setVal :: forall fieldname this val. (TypeBaseName fieldname, MakeObject this, HasField fieldname this (JSM val), ToJSVal val) => val -> IndexPreservingAction JSM this ()
setVal newval = act (setVal_ @fieldname newval)

setJson_ :: forall fieldname this val. (TypeBaseName fieldname, MakeObject this, HasField fieldname this (JSM val), ToJSON val) => val -> this -> JSM ()
setJson_ newval obj = toJSVal_aeson newval >>= (obj <# typeBaseName @fieldname)

setJson :: forall fieldname this val. (TypeBaseName fieldname, MakeObject this, HasField fieldname this (JSM val), ToJSON val) => val -> IndexPreservingAction JSM this ()
setJson newval = act (setJson_ @fieldname newval)

new_ :: (MakeObject this, MakeArgs args) => (JSVal -> res) -> args -> this -> JSM res
new_ c args this = c <$> JSaddle.new this args

new :: (MakeObject this, MakeArgs args) => (JSVal -> res) -> args -> IndexPreservingAction JSM this res
new c args = act (new_ c args)

-- | typeBaseName
-- >>> typeBaseName @Text
-- "text"
-- >>> typeBaseName @(MakeObject Text)
-- "makeobject"
--typeBaseName_ :: forall fieldname. Typeable fieldname => Text
--typeBaseName_ = toLower $ takeWhile (/= ' ') $ show (typeRep (Proxy :: Proxy fieldname))

{-
instance HasField "requestOptions" DataSource (JSM RequestOptions) where
  getField = getObj RequestOptions "requestOptions"

instance HasField "requestHeaders" RequestOptions (JSM [ReqHeader]) where
  getField = getVal "requestHeaders"

rh :: DataSource -> JSM [ReqHeader]
rh = #requestOptions >=> #requestHeaders

rh2 :: DataSource -> JSM [ReqHeader]
rh2 = getField @"requestOptions" >=> getField @"requestHeaders"

testset :: [ReqHeader] -> RequestOptions -> JSM RequestOptions
testset = setJson @"requestHeaders"

testset2 :: [ReqHeader] -> DataSource -> JSM RequestOptions
testset2 rh = #requestOptions >=> setJson @"requestHeaders" rh
-}
